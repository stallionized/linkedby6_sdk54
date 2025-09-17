#!/bin/bash
cd MyExpoApp
npm install --legacy-peer-deps
npx expo export --platform web
cd ..
cp -r presentations MyExpoApp/dist/
cp -r investors MyExpoApp/dist/
cp pdf-export-script.js MyExpoApp/dist/
