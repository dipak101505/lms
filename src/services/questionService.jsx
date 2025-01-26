import { PutCommand, QueryCommand, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDB, ddbClient } from "../firebase/config";
import {
  DescribeTableCommand,
  CreateTableCommand,
} from "@aws-sdk/client-dynamodb";

/**
 * Ensure ExamQuestions table exists.
 * If the table doesn't exist, create it with PK/SK and optional GSIs.
 */
export const ensureExamQuestionsTable = async () => {
  try {
    // Check if examResults table exists
    await ddbClient.send(
      new DescribeTableCommand({ TableName: "examResults" })
    );
  } catch (error) {
    if (error.name === "ResourceNotFoundException") {
      await ddbClient.send(
        new CreateTableCommand({
          TableName: "examResults",
          AttributeDefinitions: [
            { AttributeName: "PK", AttributeType: "S" }, // UserId
            { AttributeName: "SK", AttributeType: "S" }, // ExamId
            { AttributeName: "GSI1PK", AttributeType: "S" }, // ExamId for querying by exam
            { AttributeName: "GSI1SK", AttributeType: "S" }, // Timestamp
          ],
          KeySchema: [
            { AttributeName: "PK", KeyType: "HASH" },
            { AttributeName: "SK", KeyType: "RANGE" }
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: "ExamIndex",
              KeySchema: [
                { AttributeName: "GSI1PK", KeyType: "HASH" },
                { AttributeName: "GSI1SK", KeyType: "RANGE" }
              ],
              Projection: { ProjectionType: "ALL" }
            }
          ],
          BillingMode: "PAY_PER_REQUEST"
        })
      );
    }
  }
};
/**
 * Save or update a question.
 * Exam ID = examId
 * question = question payload
 */
export const saveQuestion = async (examId, question) => {
  const params = {
    TableName: "ExamQuestions",
    Item: {
      PK: `EXAM#${examId}`,
      SK: `QUESTION#${question.id}`,
      ...question,
      // Add GSI PK/SK
      GSI1PK: `TOPIC#${question.metadata.topic}`,
      GSI1SK: `QUESTION#${question.id}`,
      GSI2PK: `DIFFICULTY#${question.metadata.difficulty}`,
      GSI2SK: `QUESTION#${question.id}`
    }
  };
//   ensureExamQuestionsTable();
  await dynamoDB.send(new PutCommand(params));
};

/**
 * Get all questions for a specific exam.
 */
export const getExamQuestions = async (examId) => {
  const params = {
    TableName: "ExamQuestions",
    KeyConditionExpression: "PK = :pk",
    ExpressionAttributeValues: {
      ":pk": `EXAM#${examId}`
    }
  };
  console.log(params);
//   ensureExamQuestionsTable();
  const response = await dynamoDB.send(new QueryCommand(params));
  return response.Items;
};

/**
 * Get exam questions by a given topic using GSI1.
 */
export const getExamQuestionsByTopic = async (topic) => {
  const params = {
    TableName: "ExamQuestions",
    IndexName: "TopicIndex", // the GSI name from your table definition
    KeyConditionExpression: "GSI1PK = :tp",
    ExpressionAttributeValues: {
      ":tp": `TOPIC#${topic}`
    }
  };
  const response = await dynamoDB.send(new QueryCommand(params));
  return response.Items;
};

/**
 * Get exam questions by difficulty using GSI2.
 */
export const getExamQuestionsByDifficulty = async (difficulty) => {
  const params = {
    TableName: "ExamQuestions",
    IndexName: "DifficultyIndex", // the GSI name for difficulty
    KeyConditionExpression: "GSI2PK = :df",
    ExpressionAttributeValues: {
      ":df": `DIFFICULTY#${difficulty}`
    }
  };
  const response = await dynamoDB.send(new QueryCommand(params));
  return response.Items;
};

/**
 * Filter exam questions by section (no dedicated GSI here).
 * This approach scans the exam's questions, then filters results.
 * For performance at scale, consider another GSI if needed.
 */
export const getExamQuestionsBySection = async (examId, section) => {
  const allQuestions = await getExamQuestions(examId);
  return allQuestions.filter(item => item.metadata?.section === section);
};

/**
 * Get a single question by ID.
 */
export const getQuestionById = async (examId, questionId) => {
  const params = {
    TableName: "ExamQuestions",
    Key: {
      PK: `EXAM#${examId}`,
      SK: `QUESTION#${questionId}`
    }
  };
  const response = await dynamoDB.send(new GetCommand(params));
  return response.Item;
}

/**
 * Delete a question by ID.
 */
export const deleteQuestion = async (examId, questionId) => {
  const params = {
    TableName: "ExamQuestions",
    Key: {
      PK: `EXAM#${examId}`,
      SK: `QUESTION#${questionId}`
    }
  };
  await dynamoDB.send(new DeleteCommand(params));
}

/**
 * Save exam results
 */
export const saveExamResult = async (userId, examId, resultData) => {
  ensureExamQuestionsTable();
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