#!/bin/bash

FILE="$1"
NAME="$2"
DIR_PATH="$3"
 
# failsafe - exit if no file is provided as argument
[ "$FILE" == "" ] && exit

EXT=$(printf "$FILE" | awk -F . '{print $NF}')

# split the audio file in 30s parts
ffmpeg -i "$FILE" -f segment -segment_time 30 -c copy "$NAME"-%03d.$EXT

# do the separation on the parts
nice -n 19 spleeter separate -i "$NAME"-* -p spleeter:2stems -o "$DIR_PATH"

# create output folder
mkdir -p "$DIR_PATH"/"$NAME"

# save and change IFS
OLDIFS=$IFS
IFS=$'\n'

# read all file name into an array (without .mp3/wav/... extension)
fileArray=($(find $NAME-* -type f | sed 's/\.[^.]*$//'))

# keep a copy of the array for cleanup later
fileArrayOrig=($(find $NAME-* -type f | sed 's/\.[^.]*$//'))

# prepend "$DIR_PATH"/ to each array element
fileArray=("${fileArray[@]/#/"$DIR_PATH"/}")
 
# restore it
IFS=$OLDIFS

# append /vocals.wav to each element and create arrays for the stems
fileArrayVocals=("${fileArray[@]/%//vocals.wav}")
fileArrayAccompaniment=("${fileArray[@]/%//accompaniment.wav}")


# list all files to be joined in a file for ffmpeg to use as input list
printf "file '%s'\n" "${fileArrayVocals[@]}" > "${DIR_PATH}"/concat-list.txt

# concatenate the parts and convert the result to $EXT
ffmpeg -f concat -safe 0 -i "${DIR_PATH}"/concat-list.txt -c copy "$DIR_PATH"/"$NAME"/vocals.wav

# repeat for the other stems
# Accompaniment
printf "file '%s'\n" "${fileArrayAccompaniment[@]}" > "${DIR_PATH}"/concat-list.txt
ffmpeg -f concat -safe 0 -i "${DIR_PATH}"/concat-list.txt -c copy "$DIR_PATH"/"$NAME"/accompaniment.wav

rm "${DIR_PATH}"/concat-list.txt
OLDIFS=$IFS
IFS=$'\n'
rm -r $(printf "%s\n" "${fileArray[@]}")
IFS=$OLDIFS

# clean up
rm "$NAME"-*
