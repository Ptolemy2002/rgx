#! /usr/bin/bash
echo "Removing previous build"
rm -rf dist
echo "Building the project"
npm run _build

# Copy public directory if it exists
if [ -d "public" ]; then
    echo "Copying public directory to dist"
    cp -r public/* dist/
fi

echo "Finished building the project"

# Copy the whole dist folder to a Windows path if provided
if [ ! -z "$1" ]; then
    echo "Copying dist to Windows path: $1"
    # Make all necessary directories in the Windows path
    mkdir -p "/mnt/c/$1"

    # Remove all existing files in the Windows path
    rm -rf "/mnt/c/$1/*"

    # Make the dist directory in the Windows path
    mkdir -p "/mnt/c/$1/dist"
    
    # Copy all files from dist to the Windows path
    cp -r dist/* "/mnt/c/$1/dist"

    echo "Copy completed"
fi