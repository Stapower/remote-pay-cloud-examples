# Example Remote Pay Cloud POS in React

This example is a full-featured, web-based point-of-sale system developed in [React](https://reactjs.org/) that uses the Clover Cloud Connector APIs to perform all POS actions.

You can clone this repository and run the application locally.

    git clone git@github.com:clover/remote-pay-cloud-tutorial.git
    cd remote-pay-cloud-pos-react
    npm install
    npm run build
    npm start 
    
This will start a local server on port 3000. You can then navigate to http://localhost:3000 to view the application.    
    
## Prerequisites
Please see the [Getting Started with Clover Connector tutorial](https://docs.clover.com/build/getting-started-with-clover-connector/) for more information and a list of prerequisites.

## Configuration
Once you have completed the above steps you will need to modify this example application's configuration file.  Open ./src/config.js:

```javascript
    clientId: 'HBK8YZG9EQNJG', // Update this to match your "App ID".  From the Clover Developer Dashboard find your app, select "settings" and your "App ID" will be displayed.
    devicesDomain: 'https://apisandbox.dev.clover.com/v3/merchants/', // Update this to match the environment you are hitting, e.g. https://apisandbox.dev.clover.com/v3/merchants/
    oAuthDomain: 'https://sandbox.dev.clover.com' // Update this to match the environment you are hitting, e.g. https://sandbox.dev.clover.com