#! /usr/bin/bash
echo "Removing Zone.Identifier files"
find . -name "*:Zone.Identifier" -type f -delete
echo "Finished removing Zone.Identifier files"