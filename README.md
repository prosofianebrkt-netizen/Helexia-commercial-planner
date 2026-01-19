# Helexia Solar Master Planner (Enterprise Edition)

Application de planification stratégique pour le déploiement de centrales photovoltaïques.

## 🚀 Installation Locale

1.  Assurez-vous d'avoir [Node.js](https://nodejs.org/) installé.
2.  Installez les dépendances :
    ```bash
    npm install
    ```
3.  Lancez le serveur de développement :
    ```bash
    npm run dev
    ```

## 🌐 Hébergement sur GitHub Pages

Pour rendre cette application publique sur GitHub :

1.  **Créer le Repository** : Créez un nouveau repository public sur GitHub.
2.  **Pousser le code** :
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git branch -M main
    git remote add origin https://github.com/VOTRE_NOM_UTILISATEUR/NOM_DU_REPO.git
    git push -u origin main
    ```
3.  **Activer GitHub Pages** :
    *   Allez dans les **Settings** de votre repository.
    *   Cliquez sur **Pages** dans le menu de gauche.
    *   Sous "Build and deployment", choisissez **GitHub Actions**.
    *   GitHub détectera automatiquement qu'il s'agit d'un projet Vite/Static et proposera un workflow, ou vous pouvez simplement choisir "Static HTML" si vous buildez manuellement.
    
    *Méthode alternative (Branche gh-pages)* :
    1.  Lancez le build localement : `npm run build`
    2.  Poussez le contenu du dossier `dist` sur une branche `gh-pages`.

## 🛠 Stack Technique

*   **Core** : React 19, TypeScript
*   **Build** : Vite
*   **Styling** : Tailwind CSS (via CDN configuration pour portabilité)
*   **Architecture** : Moteur de calcul `scheduler.ts` découplé de l'interface.
