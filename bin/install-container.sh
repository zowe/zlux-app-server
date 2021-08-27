#RUNTIME PATHS
COMPONENT_HOME=/component
ZLUX_APP_SERVER=${COMPONENT_HOME}/share/zlux-app-server

# create runtime bin
mkdir -p ${COMPONENT_HOME}/bin 
cp ${ZLUX_APP_SERVER}/manifest.yaml ${COMPONENT_HOME} 
cp ${ZLUX_APP_SERVER}/bin/start.sh ${COMPONENT_HOME}/bin 
cp ${ZLUX_APP_SERVER}/bin/configure.sh ${COMPONENT_HOME}/bin
cp ${ZLUX_APP_SERVER}/bin/start-container.sh ${COMPONENT_HOME}/bin 

#INSTANCE PATHS 
ZLUX_WORKSPACE=${WORKSPACE_DIR}/app-server

#create app-server workspace
mkdir -p ${ZLUX_WORKSPACE} 

# configure app-server workspace
cd ${ZLUX_APP_SERVER}/bin
./configure-container.sh

#cleanup
rm -rf ${INSTALL_DIR}/files
