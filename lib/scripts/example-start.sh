#! /usr/bin/bash

bash scripts/build.sh

echo "Switching to the example directory"
cd ../example

echo "Starting the example"
npm start