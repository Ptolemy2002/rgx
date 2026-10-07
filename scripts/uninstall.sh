#! /usr/bin/bash
echo "Removing node_modules folder"
rm -rf node_modules
echo "Deleting the npm cache"
npm cache clean --force
echo "Finished uninstalling"