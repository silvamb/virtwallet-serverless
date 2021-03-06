const AWS = require('aws-sdk');
const TransactionClassifierHandler = require('./transactionClassifierHandler').TransactionClassifierHandler;
const handler = new TransactionClassifierHandler(new AWS.DynamoDB(), new AWS.EventBridge());

exports.handle = async event => {

    try {
        console.log("Processing event:", event);

        const response = await handler.reclassifyTransactions(event);

        return new Response(response);
    } catch(err) {
        console.log(err);
        return new Response({message: err.message}, 500);
    }
};

class Response {
    constructor(data, statusCode = 200){
        this.statusCode = statusCode;
        this.body = JSON.stringify(data);

        if(process.env.CORS_ALLOWED_ORIGIN) {
            this.headers = {
                'Access-Control-Allow-Origin': process.env.CORS_ALLOWED_ORIGIN,
                'Access-Control-Allow-Credentials': true,
            };
        }
    }
}