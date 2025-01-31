import { PutCommand, QueryCommand, GetCommand, DeleteCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDB, ddbClient } from "../firebase/config";
import {
  DescribeTableCommand,
  CreateTableCommand,
} from "@aws-sdk/client-dynamodb";

export const ensureExamTablesExist = async () => {
  try {
    // Ensure ExamQuestions table
    await ddbClient.send(
      new DescribeTableCommand({ TableName: "ExamQuestions" })
    );
  } catch (error) {
    if (error.name === "ResourceNotFoundException") {
      await ddbClient.send(
        new CreateTableCommand({
          TableName: "ExamQuestions",
          AttributeDefinitions: [
            { AttributeName: "PK", AttributeType: "S" }, // QUESTION#<questionId>
            { AttributeName: "SK", AttributeType: "S" }, // Always blank or optional metadata
            { AttributeName: "GSI1PK", AttributeType: "S" }, // TOPIC#<topic>
            { AttributeName: "GSI1SK", AttributeType: "S" }, // QUESTION#<questionId>
            { AttributeName: "GSI2PK", AttributeType: "S" }, // DIFFICULTY#<difficulty>
            { AttributeName: "GSI2SK", AttributeType: "S" }  // QUESTION#<questionId>
          ],
          KeySchema: [
            { AttributeName: "PK", KeyType: "HASH" },
            { AttributeName: "SK", KeyType: "RANGE" }
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: "TopicIndex",
              KeySchema: [
                { AttributeName: "GSI1PK", KeyType: "HASH" },
                { AttributeName: "GSI1SK", KeyType: "RANGE" }
              ],
              Projection: { ProjectionType: "ALL" }
            },
            {
              IndexName: "DifficultyIndex",
              KeySchema: [
                { AttributeName: "GSI2PK", KeyType: "HASH" },
                { AttributeName: "GSI2SK", KeyType: "RANGE" }
              ],
              Projection: { ProjectionType: "ALL" }
            }
          ],
          BillingMode: "PAY_PER_REQUEST"
        })
      );
    }

    // Ensure Exams table
    try {
      await ddbClient.send(
        new DescribeTableCommand({ TableName: "Exams" })
      );
    } catch (error) {
      if (error.name === "ResourceNotFoundException") {
        await ddbClient.send(
          new CreateTableCommand({
            TableName: "Exams",
            AttributeDefinitions: [
              { AttributeName: "PK", AttributeType: "S" }, // EXAM#<examId>
              { AttributeName: "SK", AttributeType: "S" }  // Always blank or optional metadata
            ],
            KeySchema: [
              { AttributeName: "PK", KeyType: "HASH" },
              { AttributeName: "SK", KeyType: "RANGE" }
            ],
            BillingMode: "PAY_PER_REQUEST"
          })
        );
      }
    }
  }
};

const cleanListOfMaps = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(item => {
    if (typeof item === 'object') {
      return Object.fromEntries(
        Object.entries(item)
          .filter(([_, value]) => value !== undefined)
      );
    }
    return item;
  });
};

export const saveQuestion = async (examId, question) => {
  await ensureExamTablesExist();

  // Clean and transform lists
  const cleanQuestion = {
    ...question,
    contents: cleanListOfMaps(question.contents || []),
    options: (question.options || []).map(option => ({
      ...option,
      contents: cleanListOfMaps(option.contents || [])
    })),
    solutionContent: cleanListOfMaps(question.solutionContent || []),
    metadata: {
      ...question.metadata,
      topic: question.metadata.topic || '',
      difficulty: question.metadata.difficulty || 'medium',
      marks: question.metadata.marks || { correct: 4, incorrect: -1 }
    }
  };

  const command = new PutCommand({
    TableName: "ExamQuestions",
    Item: {
      PK: `QUESTION#${question.id}`,
      SK: " ",
      ...cleanQuestion,
      GSI1PK: `TOPIC#${cleanQuestion.metadata.topic}`,
      GSI1SK: `QUESTION#${question.id}`,
      GSI2PK: `DIFFICULTY#${cleanQuestion.metadata.difficulty}`,
      GSI2SK: `QUESTION#${question.id}`
    }
  });

  try {
    await dynamoDB.send(command);
    await saveExamQuestion(examId, cleanQuestion, "add");
  } catch (error) {
    console.error("Error in saveQuestion:", error);
    throw error;
  }
};

const updateQuestionsList = (existingQuestions, question, status) => {
  debugger;
  if (status === "add") {
    return existingQuestions.includes(question.id)
      ? existingQuestions
      : [...existingQuestions, question.id];
  } else if (status === "rm") {
    return existingQuestions.filter(id => id !== question);
  }
  return existingQuestions;
};

export const saveExamQuestion = async (examId,question, status) => {
  // Save question to ExamQuestions table

  // Get or create exam record
  const getExamParams = {
    TableName: "Exams",
    Key: {
      PK: `EXAM#${examId}`,
      SK: " "
    }
  };
  
  const existingExam = await dynamoDB.send(new GetCommand(getExamParams));
  
  // Prepare updated questions list
  const existingQuestions = existingExam.Item?.questions || [];
  const updatedQuestions = updateQuestionsList(existingQuestions, question, status);

  // Save or update exam record
  const examParams = {
    TableName: "Exams",
    Item: {
      PK: `EXAM#${examId}`,
      SK: " ",
      questions: updatedQuestions,
      examMetadata: {
        ...existingExam.Item?.examMetadata,
        createdAt: existingExam.Item?.examMetadata?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: existingExam.Item?.examMetadata?.title || `Exam ${examId}`,
        questionCount: updatedQuestions.length
      }
    }
  };
  
  await dynamoDB.send(new PutCommand(examParams));
  if(status === "add") 
    await addOrUpdateTopic(question.metadata.topic);
};

export const getExamQuestions = async (examId) => {
  // First, get the exam to retrieve its question IDs
  const examParams = {
    TableName: "Exams",
    Key: {
      PK: `EXAM#${examId}`,
      SK: " "
    }
  };
  const examResponse = await dynamoDB.send(new GetCommand(examParams));
  const questionIds = examResponse.Item?.questions || [];

  // Fetch all questions for this exam
  const questions = await Promise.all(
    questionIds.map(async (questionId) => {
      const questionParams = {
        TableName: "ExamQuestions",
        Key: {
          PK: `QUESTION#${questionId}`,
          SK: " "
        }
      };
      const response = await dynamoDB.send(new GetCommand(questionParams));
      return response.Item;
    })
  );

  return questions;
};

export const ensureTopicsTable = async () => {
  try {
    await ddbClient.send(
      new DescribeTableCommand({ TableName: "Topics" })
    );
  } catch (error) {
    if (error.name === "ResourceNotFoundException") {
      await ddbClient.send(
        new CreateTableCommand({
          TableName: "Topics",
          AttributeDefinitions: [
            { AttributeName: "PK", AttributeType: "S" },
            { AttributeName: "topicName", AttributeType: "S" },
            { AttributeName: "createdAt", AttributeType: "S" }
          ],
          KeySchema: [
            { AttributeName: "PK", KeyType: "HASH" },
            { AttributeName: "createdAt", KeyType: "RANGE" }
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: "TopicNameIndex",
              KeySchema: [
                { AttributeName: "topicName", KeyType: "HASH" }
              ],
              Projection: {
                ProjectionType: "ALL"
              },
              ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5
              }
            }
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        })
      );
    } else {
      console.error("Error creating Topics table:", error);
      throw error;
    }
  }
};

export const getTopics = async () => {
  try {
    await ensureTopicsTable();
    
    const params = {
      TableName: "Topics",
      ProjectionExpression: "topicName, questionCount, createdAt"
    };
    
    const response = await dynamoDB.send(new ScanCommand(params));
    
    if (!response.Items || response.Items.length === 0) {
      return [];
    }
    
    return response.Items;
  } catch (error) {
    console.error("Error fetching topics:", error);
    throw error;
  }
};

const addOrUpdateTopic = async (topicName) => {
  try {
    const existingTopics = await getTopics();
    const existingTopic = existingTopics.find(t => t.topicName === topicName);

    if (existingTopic) {
      const params = {
        TableName: "Topics",
        Key: {
          PK: `TOPIC#${topicName}`,
          createdAt: existingTopic.createdAt
        },
        UpdateExpression: "SET questionCount = if_not_exists(questionCount, :start) + :inc",
        ExpressionAttributeValues: {
          ":inc": 1,
          ":start": 0
        },
        ReturnValues: "ALL_NEW"
      };
      
      return await ddbClient.send(new UpdateCommand(params));
    } else {
      return await addTopic(topicName);
    }
  } catch (error) {
    console.error("Error in addOrUpdateTopic:", error);
    throw error;
  }
};

export const addTopic = async (topicName) => {
  try {
    await ensureTopicsTable();
    
    const params = {
      TableName: "Topics",
      Item: {
        PK: `TOPIC#${topicName}`,
        topicName,
        questionCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      ConditionExpression: "attribute_not_exists(PK)"
    };
    
    await dynamoDB.send(new PutCommand(params));
    return params.Item;
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      console.warn(`Topic ${topicName} already exists`);
      return null;
    }
    console.error("Error adding topic:", error);
    throw error;
  }
};

export const incrementTopicQuestionCount = async (topicName) => {
  try {
    const params = {
      TableName: "Topics",
      Key: { PK: `TOPIC#${topicName}` },
      UpdateExpression: "SET questionCount = questionCount + :inc, updatedAt = :now",
      ExpressionAttributeValues: {
        ":inc": 1,
        ":now": new Date().toISOString()
      }
    };
    
    await dynamoDB.send(new UpdateCommand(params));
  } catch (error) {
    console.error("Error incrementing topic question count:", error);
    throw error;
  }
};

// Other methods remain mostly the same, just update table names and query logic
export const getExamQuestionsByTopic = async (topic) => {
  const params = {
    TableName: "ExamQuestions",
    IndexName: "TopicIndex",
    KeyConditionExpression: "GSI1PK = :tp",
    ExpressionAttributeValues: {
      ":tp": `TOPIC#${topic}`
    }
  };
  const response = await dynamoDB.send(new QueryCommand(params));
  return response.Items;
};

export const getExamQuestionsByDifficulty = async (difficulty) => {
  const params = {
    TableName: "ExamQuestions",
    IndexName: "DifficultyIndex",
    KeyConditionExpression: "GSI2PK = :df",
    ExpressionAttributeValues: {
      ":df": `DIFFICULTY#${difficulty}`
    }
  };
  const response = await dynamoDB.send(new QueryCommand(params));
  return response.Items;
};

export const getExamQuestionsByTopicAndDifficulty = async (topic, difficulty) => {
  try {
    const params = {
      TableName: "ExamQuestions",
      IndexName: "TopicIndex",
      KeyConditionExpression: "GSI1PK = :topic",
      FilterExpression: "GSI2PK = :difficulty",
      ExpressionAttributeValues: {
        ":topic": `TOPIC#${topic}`,
        ":difficulty": `DIFFICULTY#${difficulty}`
      }
    };
    
    const response = await dynamoDB.send(new QueryCommand(params));
    
    return response.Items.map(item => ({
      id: item.PK.split('#')[1],
      contents: item.contents,
      options: item.options,
      metadata: item.metadata,
      correctAnswer: item.correctAnswer
    }));
  } catch (error) {
    console.error('Error fetching questions by topic and difficulty:', error);
    throw error;
  }
};

export const getQuestionById = async (examId, questionId) => {
  const params = {
    TableName: "ExamQuestions",
    Key: {
      PK: `QUESTION#${questionId}`,
      SK: " "
    }
  };
  const response = await dynamoDB.send(new GetCommand(params));
  return response.Item;
};

export const deleteQuestion = async (examId, questionId) => {
  // Delete from ExamQuestions
  const questionParams = {
    TableName: "ExamQuestions",
    Key: {
      PK: `QUESTION#${questionId}`,
      SK: " "
    }
  };
  await dynamoDB.send(new DeleteCommand(questionParams));

  // Remove from exam's question list
  const examParams = {
    TableName: "Exams",
    Key: {
      PK: `EXAM#${examId}`,
      SK: " "
    },
    UpdateExpression: "REMOVE questions[#{index}]",
    ExpressionAttributeValues: {
      "#{index}": questionId
    }
  };
  await dynamoDB.send(new DeleteCommand(examParams));
};

// Other methods like saveExamResult, getUserExamResults remain the same
/**
 * Save exam results
 */
export const saveExamResult = async (userId, examId, resultData) => {
  // ensureExamQuestionsTable();
  // Convert Date objects to ISO strings
  const serializedData = {
    ...resultData,
    submittedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const params = {
    TableName: "examResults",
    Item: {
      PK: `USER#${userId}`,
      SK: `EXAM#${examId}`,
      GSI1PK: `EXAM#${examId}`,
      GSI1SK: serializedData.submittedAt,
      userId,
      examId,
      ...serializedData
    }
  };
  
  await dynamoDB.send(new PutCommand(params));
};

/**
 * Get exam results for a user
 */
export const getUserExamResults = async (userId) => {
  const params = {
    TableName: "examResults",
    KeyConditionExpression: "PK = :pk",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`
    }
  };
  
  const response = await dynamoDB.send(new QueryCommand(params));
  return response.Items;
};

/**
 * Get results for a specific exam
 */
export const getExamResults = async (examId) => {
  const params = {
    TableName: "examResults",
    IndexName: "ExamIndex",
    KeyConditionExpression: "GSI1PK = :examId",
    ExpressionAttributeValues: {
      ":examId": `EXAM#${examId}`
    }
  };
  
  const response = await dynamoDB.send(new QueryCommand(params));
  return response.Items;
};

/**
 * Get specific exam result for a user
 */
export const getUserExamResult = async (userId, examId) => {
  const params = {
    TableName: "examResults",
    Key: {
      PK: `USER#${userId}`,
      SK: `EXAM#${examId}`
    }
  };
  
  const response = await dynamoDB.send(new GetCommand(params));
  return response.Item;
};