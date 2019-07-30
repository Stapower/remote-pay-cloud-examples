"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var clover = require("remote-pay-cloud");
var cloudExample = function () {
    return {
        /**
         * Establishes a connection to the Clover device based on the configuration provided.
         */
        connect: function (connectionConfiguration) {
            if (connectionConfiguration === void 0) { connectionConfiguration = null; }
            this.cleanup(); // any existing connections.
            if (!connectionConfiguration) {
                connectionConfiguration = buildConnectionConfigFromWebForm();
            }
            clover.DebugConfig.loggingEnabled = true;
            var cloverDeviceConnectionConfiguration = null;
            if (isCloudConfig()) {
                var cloudFormValid = document.getElementById("cloudForm").checkValidity();
                if (!cloudFormValid) {
                    updateStatus("The connection configuration is not valid.  Please update the form below and try again.", false);
                    return false;
                }
                updateStatus("Attempting to connect to your Clover device, please wait  ....");
                // Configuration Note: See: https://docs.clover.com/build/getting-started-with-clover-connector/?sdk=browser for more information
                // on how to obtain the required connection parameter values.
                cloverDeviceConnectionConfiguration = getDeviceConfigurationForCloud(connectionConfiguration);
            }
            else {
                var networkFormValid = document.getElementById("networkForm").checkValidity();
                if (!networkFormValid) {
                    updateStatus("The connection configuration is not valid.  Please update the form below and try again.", false);
                    return false;
                }
                updateStatus("Attempting to connect to your Clover device, you may need to enter the manager PIN, please wait  ....");
                cloverDeviceConnectionConfiguration = getDeviceConfigurationForNetwork(connectionConfiguration);
            }
            toggleElement("connectionForm", false);
            var builderConfiguration = {};
            builderConfiguration[clover.CloverConnectorFactoryBuilder.FACTORY_VERSION] = clover.CloverConnectorFactoryBuilder.VERSION_12;
            var cloverConnectorFactory = clover.CloverConnectorFactoryBuilder.createICloverConnectorFactory(builderConfiguration);
            var cloverConnector = cloverConnectorFactory.createICloverConnector(cloverDeviceConnectionConfiguration);
            setCloverConnector(cloverConnector);
            // Work-around for typings issue in 3.1.0.  This will be fixed in the next release.
            cloverConnector.addCloverConnectorListener(buildCloverConnectionListener());
            cloverConnector.initializeConnection();
        },
        /**
         * Sends a message to your Clover device.
         */
        showMessage: function () {
            getCloverConnector().showMessage("Welcome to Clover Connector!");
            // NOTE:  We are NOT returning the device to the default screen!  Because we are not,
            // the message will remain on the device until it is told to change it.
        },
        /**
         * Resets your Clover device (will cancel ongoing transactions and return to the welcome screen).
         */
        resetDevice: function () {
            getCloverConnector().resetDevice();
        },
        /**
         * Performs a sale on your Clover device.
         */
        performSale: function () {
            var saleRequest = new clover.remotepay.SaleRequest();
            saleRequest.setExternalId(clover.CloverID.getNewId());
            saleRequest.setAmount(10);
            saleRequest.setAutoAcceptSignature(false);
            console.log({ message: "Sending sale", request: saleRequest });
            // Perform the sale.
            getCloverConnector().sale(saleRequest);
        },
        /**
         * It is important to properly dispose of your Clover Connector, this function is called in window.onbeforeunload in index.html.
         */
        cleanup: function () {
            if (getCloverConnector()) {
                getCloverConnector().dispose();
                toggleElement("actions", false);
                updateStatus("Not connected to your Clover device.  Please refresh the page to re-connect and perform an action.");
            }
        },
        showNetworkInfo: function () {
            toggleElement("networkInfo", true);
            toggleElement("cloudInfo", false);
        },
        showCloudInfo: function () {
            toggleElement("cloudInfo", true);
            toggleElement("networkInfo", false);
        }
    };
    /**
     * Builds a configuration container from the web form.
     */
    function buildConnectionConfigFromWebForm() {
        var config = {};
        if (isCloudConfig()) {
            config["applicationId"] = document.getElementById("cloudAppId").value;
            config["accessToken"] = document.getElementById("accessToken").value;
            config["cloverServer"] = document.getElementById("cloverServer").value;
            config["merchantId"] = document.getElementById("merchantId").value;
            config["deviceId"] = document.getElementById("deviceId").value;
            config["friendlyId"] = document.getElementById("friendlyId").value;
        }
        else {
            config["applicationId"] = document.getElementById("snpdAppId").value;
            config["endpoint"] = document.getElementById("endpoint").value;
            config["posName"] = document.getElementById("posName").value;
            config["serialNumber"] = document.getElementById("serialNumber").value;
            config["authToken"] = getAuthToken();
        }
        return config;
    }
    function isCloudConfig() {
        var cloudInfo = document.getElementById("cloudInfo");
        return cloudInfo && cloudInfo.style.display === "block";
    }
    /**
     * Build and return the connection configuration object for cloud.
     *
     * @param connectionConfiguration
     * @returns {WebSocketCloudCloverDeviceConfiguration}
     */
    function getDeviceConfigurationForCloud(connectionConfiguration) {
        // Work-around for typings issue in 3.1.0.  This will be fixed in the next release.
        var configBuilder = new clover.WebSocketCloudCloverDeviceConfigurationBuilder(connectionConfiguration.applicationId, connectionConfiguration.deviceId, connectionConfiguration.merchantId, connectionConfiguration.accessToken);
        configBuilder.setCloverServer(connectionConfiguration.cloverServer);
        configBuilder.setFriendlyId(connectionConfiguration.friendlyId);
        configBuilder.setHeartbeatInterval(1000);
        return configBuilder.build();
    }
    /**
     * Build and return the connection configuration object for network. When initially connecting to Secure Network
     * Pay Display pairing is required.  The configuration object provides callbacks so the application can
     * handle the pairing however it chooses.  In this case we update a UI element on the web page with the
     * pairing code that must be entered on the device to establish the connection.  The authToken returned
     * in onPairingSuccess can be saved and used later to avoid pairing for subsequent connection attempts.
     *
     * @param connectionConfiguration
     * @returns {WebSocketPairedCloverDeviceConfiguration}
     */
    function getDeviceConfigurationForNetwork(connectionConfiguration) {
        var onPairingCode = function (pairingCode) {
            var pairingCodeMessage = "Please enter pairing code " + pairingCode + " on the device";
            updateStatus(pairingCodeMessage, true);
            console.log("    >  " + pairingCodeMessage);
        };
        var onPairingSuccess = function (authToken) {
            console.log("    > Got Pairing Auth Token: " + authToken);
            setAuthToken(authToken);
        };
        // Work-around for typings issue in 3.1.0.  This will be fixed in the next release.
        var configBuilder = new clover.WebSocketPairedCloverDeviceConfigurationBuilder(connectionConfiguration.applicationId, connectionConfiguration.endpoint, connectionConfiguration.posName, connectionConfiguration.serialNumber, connectionConfiguration.authToken, onPairingCode, onPairingSuccess);
        return configBuilder.build();
    }
    /**
     * Custom implementation of ICloverConnector listener, handles responses from the Clover device.
     */
    function buildCloverConnectionListener() {
        return Object.assign({}, clover.remotepay.ICloverConnectorListener.prototype, {
            onSaleResponse: function (response) {
                updateStatus("Sale complete.", response.result === "SUCCESS");
                console.log({ message: "Sale response received", response: response });
                if (!response.getIsSale()) {
                    console.log({ error: "Response is not a sale!" });
                }
            },
            // See https://docs.clover.com/build/working-with-challenges/
            onConfirmPaymentRequest: function (request) {
                console.log({ message: "Automatically accepting payment", request: request });
                updateStatus("Automatically accepting payment", true);
                getCloverConnector().acceptPayment(request.getPayment());
                // to reject a payment, pass the payment and the challenge that was the basis for the rejection
                // getCloverConnector().rejectPayment(request.getPayment(), request.getChallenges()[REJECTED_CHALLENGE_INDEX]);
            },
            // See https://docs.clover.com/build/working-with-challenges/
            onVerifySignatureRequest: function (request) {
                console.log({ message: "Automatically accepting signature", request: request });
                updateStatus("Automatically accepting signature", true);
                getCloverConnector().acceptSignature(request);
                // to reject a signature, pass the request to verify
                // getCloverConnector().rejectSignature(request);
            },
            onDeviceReady: function (merchantInfo) {
                updateStatus("Your Clover device is ready to process requests.", true);
                console.log({ message: "Device Ready to process requests!", merchantInfo: merchantInfo });
                toggleElement("connectionForm", false);
                toggleElement("actions", true);
            },
            onDeviceError: function (cloverDeviceErrorEvent) {
                updateStatus("An error has occurred and we could not connect to your Clover Device. " + cloverDeviceErrorEvent.message, false);
                toggleElement("connectionForm", true);
                toggleElement("actions", false);
            },
            onDeviceDisconnected: function () {
                updateStatus("The connection to your Clover Device has been dropped.", false);
                console.log({ message: "Disconnected" });
                toggleElement("connectionForm", true);
                toggleElement("actions", false);
            }
        });
    }
    function toggleElement(eleId, show) {
        var actionsEle = document.getElementById(eleId);
        if (show) {
            actionsEle.style.display = "block";
        }
        else {
            actionsEle.style.display = "none";
        }
    }
    function updateStatus(message, success) {
        if (success === void 0) { success = false; }
        toggleElement("statusContainer", true);
        var statusEle = document.getElementById("statusMessage");
        statusEle.innerHTML = message;
        if (success === false) {
            statusEle.className = "alert alert-danger";
        }
        else if (success) {
            statusEle.className = "alert alert-success";
        }
        else {
            statusEle.className = "alert alert-warning";
        }
    }
    function setCloverConnector(cloverConnector) {
        this.cloverConnector = cloverConnector;
    }
    function getCloverConnector() {
        return this.cloverConnector;
    }
    function setAuthToken(authToken) {
        this.authToken = authToken;
    }
    function getAuthToken() {
        return this.authToken;
    }
};
exports.cloudExample = cloudExample;