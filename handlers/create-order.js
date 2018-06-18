'use strict'

const AWS = require('aws-sdk')
const docClient = new AWS.DynamoDB.DocumentClient()
const rp = require('minimal-request-promise')

function createOrder(request) {
  console.log('Save an order', request.body);
  const userData = request.context.authorizer.claims;
  console.log('User Data', userData);

  let userAddress = request.body && request.body.address
  if (!userAddress) { 
    userAddress = JSON.parse(userData.address).formatted
  }

  if (!request || !request.pizza || !request.address)
    throw new Error('To order pizza please provide pizza type and address where pizza should be delivered')

  return rp.post('https://some-like-it-hot.effortless-serverless.com/delivery', {
    headers: {
      Authorization: 'aunt-marias-pizzeria-1234567890',
      'Content-type': 'application/json'
    },
    body: JSON.stringify({
      pickupTime: '15.34pm',
      pickupAddress: 'Aunt Maria Pizzeria',
      deliveryAddress: userAddress,
      webhookUrl: 'https://rc5xs549z0.execute-api.eu-central-1.amazonaws.com/latest/delivery',
    })
  })
    .then(rawResponse => JSON.parse(rawResponse.body))
    .then(response => {
      return docClient.put({
        TableName: 'pizza-orders',
        Item: {
          cognitoUsername: userAddress['cognito:username'],
          orderId: response.deliveryId,
          pizza: request.pizza,
          address: userAddress,
          orderStatus: 'pending'
        }
      }).promise()
    })
    .then(res => {
      console.log('Order is saved!', res)

      return res
    })
    .catch(saveError => {
      console.log(`Oops, order is not saved :(`, saveError)

      throw saveError
    })
}

module.exports = createOrder
