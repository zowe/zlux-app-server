#!/bin/sh

mkdir -p tmp/lib
mkdir -p tmp/bin

root_dir=/u/ts3105/zowe-1.24.0-pr-2338-1-20210915112450/root

convert_and_copy() {
  file="$1"
  dos2unix -n "${file}" "tmp/${file}"  
  target="$root_dir/components/app-server/share/zlux-app-server/${file}"
  scp "tmp/${file}" rs28:"${target}"
  ssh rs28 "chtag -r ${target}"
}

files=(lib/zluxArgs.js bin/convert-env.sh)
for i in "${files[@]}"
do
	convert_and_copy "$i"
done

rm -rf ./tmp
#scp bin/convert-env.sh rs28:$root_dir/components/app-server/share/zlux-app-server/bin