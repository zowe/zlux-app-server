#RUNTIME PATHS
ZLUX_RUNTIME=${ROOT_DIR}/components/app-server
ZLUX_APP_SERVER=${ZLUX_RUNTIME}/share/zlux-app-server

# create runtime bin
mkdir -p ${ZLUX_RUNTIME}/bin 
cp ${ZLUX_APP_SERVER}/manifest.yaml ${ZLUX_RUNTIME} 
cp ${ZLUX_APP_SERVER}/bin/start.sh ${ZLUX_RUNTIME}/bin 
cp ${ZLUX_APP_SERVER}/bin/configure.sh ${ZLUX_RUNTIME}/bin
cp ${ZLUX_APP_SERVER}/bin/start-container.sh ${ZLUX_RUNTIME}/bin 

#INSTANCE PATHS 
ZLUX_WORKSPACE=${WORKSPACE_DIR}/app-server

#create app-server workspace
mkdir -p ${ZLUX_WORKSPACE} 

# configure app-server workspace
cd ${ZLUX_APP_SERVER}/bin
./configure-container.sh

#cleanup
rm -rf ${INSTALL_DIR}/files