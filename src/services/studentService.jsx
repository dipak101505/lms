import { PutCommand, QueryCommand, GetCommand, DeleteCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDB, ddbClient } from "../firebase/config";
import {
  DescribeTableCommand,
  CreateTableCommand,
} from "@aws-sdk/client-dynamodb";

  
export const ensureStudentTableExists = async () => {
    try {
      await ddbClient.send(new DescribeTableCommand({ TableName: "Students" }));
    } catch (error) {
      if (error.name === "ResourceNotFoundException") {
        await ddbClient.send(new CreateTableCommand({
          TableName: "Students",
          AttributeDefinitions: [
            { AttributeName: "PK", AttributeType: "S" },
            { AttributeName: "SK", AttributeType: "S" },
            { AttributeName: "GSI1PK", AttributeType: "S" },
            { AttributeName: "GSI1SK", AttributeType: "S" }
          ],
          KeySchema: [
            { AttributeName: "PK", KeyType: "HASH" },
            { AttributeName: "SK", KeyType: "RANGE" }
          ],
          GlobalSecondaryIndexes: [{
            IndexName: "StudentIndex",
            KeySchema: [
              { AttributeName: "GSI1PK", KeyType: "HASH" },
              { AttributeName: "GSI1SK", KeyType: "RANGE" }
            ],
            Projection: { ProjectionType: "ALL" }
          }],
          BillingMode: "PAY_PER_REQUEST"
        }));
      }
    }
  };
  
  export const upsertStudent = async (studentData) => {
    await ensureStudentTableExists();
    
    const params = {
      TableName: "Students",
      Item: {
        PK: "STUDENT#ALL",
        SK: `STUDENT#${studentData.email}`,
        name: studentData.name,
        email: studentData.email,
        batch: studentData.batch,
        centres: studentData.centres || [],
        subjects: studentData.subjects || [],
        enrollmentDate: studentData.enrollmentDate,
        imageUrl: studentData.imageUrl || '',
        class: studentData.class || '',
        board: studentData.board || '',
        mobile: studentData.mobile || '',
        address: studentData.address || '',
        status: studentData.status || 'inactive',
        dob: studentData.dob || '',
        school: studentData.school || '',
        amountPending: studentData.amountPending || 0,
        paymentType: studentData.paymentType || 'lumpsum',
        monthlyInstallment: studentData.monthlyInstallment || 0,
        updatedAt: new Date().toISOString(),
        chatIds: studentData.chatIds || [],
        GSI1PK: `BATCH#${studentData.batch}`,
        GSI1SK: `STUDENT#${studentData.email}`,
      }
    };
  
    await dynamoDB.send(new PutCommand(params));
    return { id: studentData.email };
  };
  
  export const getStudentByEmail = async (email) => {
    const params = {
      TableName: "Students",
      KeyConditionExpression: "PK = :pk AND SK = :sk",
      ExpressionAttributeValues: {
        ":pk": "STUDENT#ALL",
        ":sk": `STUDENT#${email}`
      }
    };
  
    const response = await dynamoDB.send(new QueryCommand(params));
    return response.Items?.[0];
  };
  
  export const getStudentsByBatch = async (batch) => {
    const params = {
      TableName: "Students",
      IndexName: "StudentIndex",
      KeyConditionExpression: "GSI1PK = :batchId",
      ExpressionAttributeValues: {
        ":batchId": `BATCH#${batch}`
      }
    };
  
    const response = await dynamoDB.send(new QueryCommand(params));
    return response.Items || [];
  };
  
  export const getAllStudents = async () => {
    const params = {
      TableName: "Students",
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": "STUDENT#ALL"
      }
    };
  
    const response = await dynamoDB.send(new QueryCommand(params));
    return response.Items || [];
  };