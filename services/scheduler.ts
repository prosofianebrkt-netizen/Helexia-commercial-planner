import { 
  ProjectConfig, 
  PhaseResult, 
  ProjectTypology, 
  InjectionType, 
  InvestmentModel,
  DateRange
} from '../types';

/**
 * Utility to add months to a date. 
 * Handles month rollover correctly.
 */
export const addMonths = (date: Date, months: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

/**
 * Utility to calculate difference in months.
 */
export const diffMonths = (d1: Date, d2: Date): number => {
  let months;
  months = (d2.getFullYear() - d1.getFullYear()) * 12;
  months -= d1.getMonth();
  months += d2.getMonth();
  return months <= 0 ? 0 : months;
};

/**
 * Utility to subtract months from a date.
 */
export const subMonths = (date: Date, months: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
};

/**
 * Checks if a specific date falls in a restricted month (Jan, Apr, Aug)
 * 0 = Jan, 3 = Apr, 7 = Aug
 */
export const isRestrictedMonth = (date: Date): boolean => {
  const m = date.getMonth();
  return m === 0 || m === 3 || m === 7;
};

/**
 * CORE ENGINE
 * Calculates the entire timeline based on inputs.
 */
export const calculateProjectTimeline = (config: ProjectConfig): PhaseResult => {
  const T0 = new Date(config.signatureDate);
  const P = config.powerKWc;
  const skipped = config.skippedPhases || {};
  
  // 1. Negotiation (T0 - 0.5 months)
  let negotiationRange: DateRange | undefined;
  if (!skipped.negotiation) {
    let negDuration = 0.5;
    if (config.overrides.negotiationDuration !== undefined) negDuration = config.overrides.negotiationDuration;
    
    // Calculate start based on duration ending at T0
    // Approximate days
    const days = Math.round(negDuration * 30.44);
    const negotiationStart = new Date(T0);
    negotiationStart.setDate(T0.getDate() - days);
    
    negotiationRange = { start: negotiationStart, end: T0, durationMonths: negDuration };
  }
  
  // 2. Urbanism
  // Rule: > 3000kWc OR New Roof = 6 months, Else 4 months
  let urbanRange: DateRange | undefined;
  let urbanEnd = new Date(T0); // Default if skipped

  if (!skipped.urbanism) {
    let urbanDuration = (P > 3000 || config.typology === ProjectTypology.ROOF_NEW) ? 6 : 4;
    if (config.overrides.urbanismDuration !== undefined) urbanDuration = config.overrides.urbanismDuration;
    
    const urbanStart = new Date(T0);
    urbanEnd = addMonths(urbanStart, urbanDuration);
    urbanRange = { start: urbanStart, end: urbanEnd, durationMonths: urbanDuration };
  }

  // 3. Security Phase (Parallel)
  
  // AO CRE
  // Rule: Only if > 100kWc AND Injection
  let creRange: { start: Date, end: Date, durationMonths: number } | undefined;
  if (!skipped.aoCre && P > 100 && config.injectionType === InjectionType.TOTAL_INJECTION) {
    let dur = 4;
    if (config.overrides.creDuration !== undefined) dur = config.overrides.creDuration;
    creRange = {
      start: new Date(urbanEnd),
      end: addMonths(urbanEnd, dur),
      durationMonths: dur
    };
  }

  // Lease Management
  // Rule: Only if Third-Party Investment
  let leaseRange: { start: Date, end: Date, durationMonths: number } | undefined;
  if (!skipped.leaseManagement && config.investmentModel === InvestmentModel.OWN_INVESTMENT) {
    let dur = 4; // Standard
    if (config.overrides.leaseDuration !== undefined) dur = config.overrides.leaseDuration;
    
    leaseRange = {
      start: new Date(urbanEnd),
      end: addMonths(urbanEnd, dur),
      durationMonths: dur
    };
  }

  // Determine "Securization End" (The Lock)
  // The project cannot proceed to physical implementation before these are done.
  const creEndDate = creRange ? creRange.end : urbanEnd;
  const leaseEndDate = leaseRange ? leaseRange.end : urbanEnd;
  // The earliest possible start for construction/connection dependency
  const securityLockDate = new Date(Math.max(creEndDate.getTime(), leaseEndDate.getTime()));

  // 4. Connection
  let connectionDuration = 0;
  if (config.overrides.connectionDuration !== undefined) {
    connectionDuration = config.overrides.connectionDuration;
  } else if (config.injectionType === InjectionType.AUTOCONSUMPTION) {
    connectionDuration = 5;
  } else {
    // Injection Rules
    if (P <= 36) connectionDuration = 6;
    else if (P <= 250) connectionDuration = 9;
    else if (P <= 1000) connectionDuration = 12;
    else connectionDuration = 18;
  }

  // If connection is skipped (unlikely but possible via override logic or request)
  if (skipped.connection) {
      connectionDuration = 0;
  }

  // Initially, Connection starts after the later of Urbanism or CRE.
  let connectionStart = new Date(securityLockDate);
  let connectionEnd = addMonths(connectionStart, connectionDuration);

  // 5. Construction
  let constructionRange: DateRange;
  
  if (skipped.construction) {
     constructionRange = { start: connectionStart, end: connectionStart, durationMonths: 0 };
  } else {
    // Determine Theoretical Work Needed.
    let workMonthsNeeded = 3; // Base default
    if (P > 500) workMonthsNeeded = 4;
    if (P > 2000) workMonthsNeeded = 6;
    if (config.overrides.constructionDuration !== undefined) workMonthsNeeded = config.overrides.constructionDuration;

    // We calculate BACKWARDS from the Target End Date.
    const targetConstructionEnd = new Date(connectionEnd);
    targetConstructionEnd.setDate(targetConstructionEnd.getDate() - 15); // -0.5 months

    let constructionStartDate = new Date(targetConstructionEnd);
    
    if (config.isSubcontracted) {
        // Simple calculation
        constructionStartDate = subMonths(targetConstructionEnd, workMonthsNeeded);
    } else {
        // Complex Seasonality Logic (Helexia Internal)
        let validMonthsFound = 0;
        let cursor = new Date(targetConstructionEnd);
        let protection = 0;
        while (validMonthsFound < workMonthsNeeded && protection < 36) { 
        // Move cursor back 1 month
        const prevMonth = subMonths(cursor, 1);
        
        // Check the month we just traversed
        if (!isRestrictedMonth(prevMonth)) {
            validMonthsFound++;
        }
        cursor = prevMonth;
        protection++;
        }
        constructionStartDate = cursor;
    }

    // CONSTRAINT CHECK: Construction cannot start before Security Lock.
    if (constructionStartDate < securityLockDate) {
        // Shift Start
        constructionStartDate = new Date(securityLockDate);
        // Recalculate End based on work needed (forward pass)
        if (config.isSubcontracted) {
            const actualConstructionEnd = addMonths(constructionStartDate, workMonthsNeeded);
            // Connection must end 0.5 months AFTER construction ends
            const newConnectionEnd = new Date(actualConstructionEnd);
            newConnectionEnd.setDate(newConnectionEnd.getDate() + 15);
            
            // Update Connection Range
            if (!skipped.connection) {
                connectionEnd = newConnectionEnd;
                connectionStart = subMonths(connectionEnd, connectionDuration);
            }
        } else {
            // Forward pass with seasonality
            let cursor = new Date(constructionStartDate);
            let validMonthsAdded = 0;
            let protection = 0;
            while (validMonthsAdded < workMonthsNeeded && protection < 36) {
                const isRestricted = isRestrictedMonth(cursor);
                if (!isRestricted) {
                validMonthsAdded++; // We count this month as productive
                }
                cursor = addMonths(cursor, 1);
                protection++;
            }
            const actualConstructionEnd = cursor;
        
            // Update Connection
            const newConnectionEnd = new Date(actualConstructionEnd);
            newConnectionEnd.setDate(newConnectionEnd.getDate() + 15);
            
            if (!skipped.connection) {
                connectionEnd = newConnectionEnd;
                connectionStart = subMonths(connectionEnd, connectionDuration);
            }
        }
    }
    
    constructionRange = { 
        start: constructionStartDate, 
        end: new Date(connectionEnd.getTime() - (15 * 24 * 60 * 60 * 1000)), // Recalculate exact end
        durationMonths: diffMonths(constructionStartDate, connectionEnd) // Approximation
    };
  }

  // 6. Operation (COD)
  // Starts 1 month after Connection (Raccordement)
  const codDate = addMonths(connectionEnd, 1);

  const finalNegotiationStart = negotiationRange ? negotiationRange.start : T0;

  return {
    negotiation: negotiationRange,
    urbanism: urbanRange,
    aoCre: creRange,
    leaseManagement: leaseRange,
    connection: { start: connectionStart, end: connectionEnd, durationMonths: connectionDuration },
    construction: constructionRange,
    operation: { start: codDate, end: addMonths(codDate, 24), durationMonths: 24 }, // Show 2 years of ops
    milestones: {
      loi: negotiationRange ? T0 : undefined, // LOI aligned at end of negotiation (Usually T0 is signature, negotiation ends there)
      signature: T0,
      urbanismOk: urbanRange ? urbanEnd : undefined,
      laureate: creRange?.end,
      leaseSigned: leaseRange?.end,
      constructionCompletion: constructionRange.end,
      cod: codDate
    },
    totalDurationMonths: diffMonths(finalNegotiationStart, codDate)
  };
};