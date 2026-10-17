# LabWatch

LabWatch is a frontend prototype for managing computer laboratory incidents, inventory, and maintenance. It uses plain HTML, CSS, and JavaScript, with demo data enabled by default.

## Run locally

Open `index.html` in a browser. Demo mode is enabled by default, so no backend server is needed.

## Backend configuration

The frontend API base URL, demo mode, and endpoint paths are in `config.js`. Demo mode is enabled by default. Do not put passwords, API keys, or other secrets in frontend files; values shipped to a browser are visible to users.

## Git basics

After setting your Git author identity, save the first version:

```powershell
git add .
git commit -m "Initial LabWatch prototype"
```

`git add` stages the files for a commit. `git commit` saves a snapshot in your local repository; it does not upload anything to GitHub.
