# create bin directory
CONTAINER_SCRIPTS=${INSTALL_DIR}/files/scripts

#RUNTIME PATHS
ZLUX_RUNTIME=${ROOT_DIR}/components/app-server
ZLUX_APP_SERVER=${ZLUX_RUNTIME}/share/zlux-app-server

#INSTANCE PATHS APP-SERVER workspace
ZLUX_WORKSPACE=${WORKSPACE_DIR}/app-server

mkdir -p ${ZLUX_RUNTIME}/bin 
cp ${ZLUX_APP_SERVER}/manifest.yaml ${ZLUX_RUNTIME} 
cp ${ZLUX_APP_SERVER}/bin/start.sh ${ZLUX_RUNTIME}/bin 
cp ${ZLUX_APP_SERVER}/bin/configure.sh ${ZLUX_RUNTIME}/bin

mkdir -p ${ZLUX_WORKSPACE} 
cp ${CONTAINER_SCRIPTS}/start-container.sh ${ZLUX_RUNTIME}/bin 
cd ${CONTAINER_SCRIPTS} && ./configure-container.sh
rm -rf ${INSTALL_DIR}/files