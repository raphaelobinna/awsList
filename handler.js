'use strict';
const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' })
const { v4: uuidv4 } = require('uuid');

const todoTable = process.env.TODO_TABLE
// create a response
function response(statusCode, message){
  return {
    statusCode: statusCode,
    body: JSON.stringify(message)
  }
}
//my sorting function
function sortByDate(a, b){
  if(a.createdAt > b.createdAt){
    return -1
  } else {
    return 1
  }
}
//Add an Item
module.exports.createList = (event, context, callback) => {
  const reqBody = JSON.parse(event.body);
//checking whether data passed is empty
  if (
    !reqBody.body ||
    reqBody.body.trim() === ''
  ) {
    return callback(
      null,
      response(400, {
        error: 'Llist Item must have a body and must not be empty'
      })
    );
  }

  const todo = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    item: reqBody.body
  }

  return db.put({
    TableName: todoTable,
    Item: todo
  }).promise().then(() => {
    callback(null, response(201, todo))
  })
  .catch(err => response(null, response(err.statusCode, err)))
}
//Get all List Items
module.exports.getAllLists = (event, context, callback) => {
    return db.scan({
      TableName: todoTable
    }).promise().then(res => {
      callback(null, response(200, res.Items.sort(sortByDate)))
    }).catch(err => callback(null, response(err.statusCode, err)))
}
//get number of List Items
module.exports.getLists = (event, context, callback) => {
  const numberOfPosts = event.pathParameters.number;
  const params = {
    TableName: todoTable,
    Limit: numberOfPosts
  };
  return db.scan(params)
    .promise()
    .then(res => {
      callback(null, response(200, res.Items.sort(sortByDate)))
    }).catch(err => callback(null, response(err.statusCode, err)))
    
}
//get a single List Item
module.exports.getList = (event, context, callback) => {
  const id = event.pathParameters.id;
    const params = {
      Key: {
        id: id
      },
      TableName: todoTable
    }

  return db.get(params).promise()
      .then(res => {
        if(res.Item) callback(null, response(200, res.Item))
        else callback(null, response(404, { error: 'List Item not Found' }))
      })
      .catch(err => callback(null, response(err.statusCode, err)))
}
//update a List Item
module.exports.updateList = (event, context, callback) => {
  const id = event.pathParameters.id;
  const reqBody = JSON.parse(event.body);
  const { body } = reqBody;


  const params = {
    Key: {
      id: id
    },
    TableName: todoTable,
    ConditionExpression: 'attribute_exists(id)',
    UpdateExpression: 'SET body = :body',
    ExpressionAttributeValues: {
      ':body': body
    },
    ReturnValues: 'ALL_NEW'
  };
  console.log('Updating');

  return db
  .update(params)
  .promise()
  .then((res) => {
    console.log(res);
    callback(null, response(200, res.Attributes));
  })
  .catch((err) => callback(null, response(err.statusCode, err)));
}
//Delete a List Item
module.exports.deleteList = (event, context, callback) => {
  const id = event.pathParameters.id;
  const params = {
    Key: {
      id: id
    },
    TableName: todoTable
  };
  return db.delete(params)
    .promise()
    .then(() => callback(null, response(200, { message: 'Item deleted successfully' })))
    .catch((err) => callback(null, response(err.statusCode, err)));
}