#! /usr/bin/bash
echo "Removing previous build"
rm -rf dist
echo "Building the project"
npm run _build
echo "Finished building the project"