#RUNTIME PATHS
ZLUX_APP_SERVER=${ZWED_INSTALL_DIR}/share/zlux-app-server

# create runtime bin
mkdir -p ${ZWED_INSTALL_DIR}/bin 
cp ${ZLUX_APP_SERVER}/manifest.yaml ${ZWED_INSTALL_DIR} 
cp ${ZLUX_APP_SERVER}/bin/start.sh ${ZWED_INSTALL_DIR}/bin 
cp ${ZLUX_APP_SERVER}/bin/configure.sh ${ZWED_INSTALL_DIR}/bin
cp ${ZLUX_APP_SERVER}/bin/start-container.sh ${ZWED_INSTALL_DIR}/bin 

# configure app-server workspace
cd ${ZLUX_APP_SERVER}/bin
./configure-container.sh

#cleanup
rm -rf ${ZWED_INSTALL_DIR}/files
