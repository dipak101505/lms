import { PutCommand, QueryCommand, GetCommand, DeleteCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDB, ddbClient } from "../firebase/config";
import {
  DescribeTableCommand,
  CreateTableCommand,
} from "@aws-sdk/client-dynamodb";

  

const videoCacheTableName = 'video_cache'; // Consistent naming (snake_case)
const videoCachePartitionKey = 'global';


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
        payments: studentData.payments || [],
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

  
export const ensureVideoCacheTableExists = async () => { // Consistent naming
  try {
    await ddbClient.send(new DescribeTableCommand({ TableName: videoCacheTableName })); // Use ddbClient
    console.log("Video cache table exists.");
    return true;
  } catch (error) {
    if (error.name === "ResourceNotFoundException") {
      console.log("Video cache table does not exist. Creating...");
      try {
        const createParams = {
          TableName: videoCacheTableName,
          KeySchema: [
            { AttributeName: 'partitionKey', KeyType: 'HASH' }
          ],
          AttributeDefinitions: [
            { AttributeName: 'partitionKey', AttributeType: 'S' }
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,  // Adjust as needed
            WriteCapacityUnits: 5   // Adjust as needed
          }
        };
        const command = new CreateTableCommand(createParams);
        await ddbClient.send(command); // Use ddbClient.send
        console.log("Video cache table created successfully!");

        // Wait for the table to be active
        let tableActive = false;
        while (!tableActive) {
          try {
            const describeTableResponse = await ddbClient.send(new DescribeTableCommand({ TableName: videoCacheTableName }));
            tableActive = describeTableResponse.Table.TableStatus === "ACTIVE";
            if (!tableActive) {
              console.log("Waiting for table to become active...");
              await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
            }
          } catch (describeError) {
            console.error("Error describing table:", describeError);
            return false;
          }
        }
        console.log("Video cache table is now active.");
        return true;
      } catch (createErr) {
        console.error("Error creating video cache table:", createErr);
        return false;
      }
    } else {
      console.error("Error describing video cache table:", error);
      return false;
    }
  }
};

export const storeVideoFiles = async (videoFiles) => {
  const tableExists = await ensureVideoCacheTableExists();
  if (!tableExists) return;

  const params = {
    TableName: videoCacheTableName, // Consistent table name
    Item: {
      partitionKey: videoCachePartitionKey, // Consistent partition key
      videoFiles: videoFiles
    }
  };

  try {
    console.log('Storing video files...');
    console.log(params);
    await dynamoDB.send(new PutCommand(params)); // Use PutCommand
    console.log('Video files stored successfully!');
  } catch (error) {
    console.error('Error storing video files:', error);
  }
};

export const retrieveVideoFiles = async () => {
  const tableExists = await ensureVideoCacheTableExists();
  if (!tableExists) return null;

  const params = {
    TableName: videoCacheTableName, // Consistent table name
    Key: {
      partitionKey: videoCachePartitionKey // Consistent partition key
    }
  };

  try {
    const data = await dynamoDB.send(new GetCommand(params)); // Use GetCommand

    if (data.Item && data.Item.videoFiles) {
      console.log('Video files retrieved successfully.');
      return data.Item.videoFiles;
    } else {
      console.log('No video files found.');
      return null;
    }
  } catch (error) {
    console.error('Error retrieving video files:', error);
    return null;
  }
};

export const getStudentStatusCount = async () => {
  const students = await getAllStudents();
  return students.reduce((acc, student) => {
    const status = student.status || 'inactive';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
};

export const updateStudentStatus = async (email, status) => {
  const params = {
    TableName: "Students",
    Key: {
      PK: "STUDENT#ALL",
      SK: `STUDENT#${email}`
    },
    UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
    ExpressionAttributeNames: {
      "#status": "status"
    },
    ExpressionAttributeValues: {
      ":status": status,
      ":updatedAt": new Date().toISOString()
    },
    ReturnValues: "ALL_NEW"
  };

  const response = await dynamoDB.send(new UpdateCommand(params));
  return response.Attributes;
};

export const getActiveStudents = async () => {
  const students = await getAllStudents();
  return students.filter(student => student.status === 'active');
};

export const getStudentsByFilter = async (filters) => {
  const students = await getAllStudents();
  return students.filter(student => {
    return (!filters.batch || student.batch === filters.batch) &&
           (!filters.centre || student.centres.includes(filters.centre)) &&
           (!filters.status || student.status === filters.status);
  });
};

export const updateStudentAttendance = async (email, attendanceRecord) => {
  const { subject, topic, status } = attendanceRecord;
  const timestamp = new Date().toISOString();
  
  // First, get the current attendance data
  const getParams = {
    TableName: "Students",
    Key: {
      PK: "STUDENT#ALL",
      SK: `STUDENT#${email}`
    },
    ProjectionExpression: "attendance"
  };

  try {
    const currentData = await dynamoDB.send(new GetCommand(getParams));
    const currentAttendance = currentData.Item?.attendance || {};
    
    // Prepare the new attendance record
    const newRecord = {
      status,
      timestamp,
      date: new Date().toLocaleDateString()
    };

    // Build the updated attendance structure
    const updatedAttendance = {
      ...currentAttendance,
      [subject]: {
        ...currentAttendance[subject],
        [topic]: [
          ...(currentAttendance[subject]?.[topic] || []),
          newRecord
        ]
      }
    };

    // Update with the combined data
    const updateParams = {
      TableName: "Students",
      Key: {
        PK: "STUDENT#ALL",
        SK: `STUDENT#${email}`
      },
      UpdateExpression: "SET attendance = :attendance",
      ExpressionAttributeValues: {
        ":attendance": updatedAttendance
      }
    };

    await dynamoDB.send(new UpdateCommand(updateParams));
    
  } catch (error) {
    console.error(`Error updating attendance for student ${email}:`, error);
    throw error;
  }
};