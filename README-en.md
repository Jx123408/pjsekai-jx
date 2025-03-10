[日本語](https://github.com/1217pond/SonolusWP_dev/blob/main/README.md)
# SonolusWP_dev
This repository contains directories for setting up a development environment using Node.js, Vite, React, and Assembly Script. It is released under the MIT license.

# Environment Setup
My environment is as follows:
> Windows 11  
> nvm-windows v1.2.2  

## Download the Repository
Download and extract the repository.  
The file structure should look like the following tree.  
(Set the `env` directory as the current directory.  
Also, create the `./build` directory and `./src/as/build` directory.)
```
env
│  asconfig.json
│  package.json
│  vite.config.js
│
├─build
└─src
    │  engine.js
    │  i18n.js
    │  index.html
    │  manifest.json
    │  style.css
    │  system.jsx
    │
    ├─as
    │  ├─assembly
    │  │      index.d.ts
    │  │      node_calc.ts
    │  │
    │  └─build
    └─public
        │  sw.js
        │
        ├─icons
        │      favicon.ico
        │      favicon.png
        │
        ├─localization
        │      en-localization-react.json
        │      ja-localization-react.json
        │
        ├─textures
        │      cancel.svg
        │      caution.svg
        │      caution_orange.svg
        │      close.svg
        │      cloud_download.png
        │      delete.svg
        │      edit.svg
        │      loading.svg
        │      system_tex.webp
        │      unknown.png
        │
        └─zlib
                gunzip.min.js
                unzip.min.js
```
## Install Node.js
(If you already have a working environment with Node.js and npm, you can skip this step.)  
Install nvm. In my Windows 11 environment, I installed [nvm-windows](https://github.com/coreybutler/nvm-windows).  
Then, install Node.js and npm (LTS) using the following command:
```
nvm install lts
```
Next, check the currently running version of Node.js:
```
nvm list
```
The version marked with `*` is the active Node.js version.  
If `*` is not present or is on a non-LTS version, switch to LTS using:
```
nvm use lts
```
## Install Modules
Run the following command in the current directory:
```
npm install
```
## Compile Assembly Script
Compile the Assembly Script with the following command:
```
npm run asc_release
```
## Build the Site
Build the site using the following command:
```
npm run build
```
## Display the Site
Open `index.html` using VSCode's Live Server or another local server.
