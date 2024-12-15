// src/pages/EditExamPage.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  updateDoc,
  addDoc,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import styled from "styled-components";
import Katex from "@matejmazur/react-katex";
import "katex/dist/katex.min.css";

const CONTENT_TYPES = {
  TEXT: "text",
  IMAGE: "image",
  LATEX: "latex",
  TABLE: "table",
};

const QUESTION_TYPES = {
  MCQ: "single",
  MULTIPLE: "multiple",
  INTEGER: "integer",
  NUMERICAL: "numerical",
};

const Container = styled.div`
  display: flex;
  height: 100vh;
`;

const EditorSection = styled.div`
  width: 50%;
  padding: 20px;
  border-right: 1px solid #e2e8f0;
  overflow-y: auto;
`;

const PreviewSection = styled.div`
  width: 50%;
  padding: 20px;
  overflow-y: auto;
`;

const defaultQuestionSchema = {
  contents: [],
  type: QUESTION_TYPES.MCQ,
  options: [],
  correctAnswer: "",
  metadata: {
    section: "",
    topic: "",
    difficulty: "medium",
    marks: { correct: 4, incorrect: -1 },
  },
};

const ContentRenderer = ({ content }) => {
  switch (content.type) {
    case CONTENT_TYPES.TEXT:
      return <span className="text-content">{content.value}</span>;
    case CONTENT_TYPES.LATEX:
      return <Katex math={content.value} />;
    case CONTENT_TYPES.IMAGE:
      return (
        <div>
        <img
          src={content.value}
          width={content.dimensions?.width}
          height={content.dimensions?.height}
          alt="Question content"
          className="my-2"
          style={{ marginTop: "10px", marginBottom: "10px" }}
        /></div>
      );
    default:
      return null;
  }
};

function EditExamPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const examData = location.state?.examData;
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(defaultQuestionSchema);
  const [selectedSection, setSelectedSection] = useState("all");

  useEffect(() => {
    if (!examData) {
      navigate("/exams");
      return;
    }
    fetchQuestions();
  }, [examData]);

  const fetchQuestions = async () => {
    try {
      const questionsSnapshot = await getDocs(
        collection(db, `exams/${examData.id}/questions`),
      );
      setQuestions(
        questionsSnapshot.docs?.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
      );
      console.log("Questions:", questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  };

  const handleAddContent = (type) => {
    setCurrentQuestion((prev) => ({
      ...prev,
      contents: [
        ...prev.contents,
        {
          type,
          value: "",
          dimensions:
            type === CONTENT_TYPES.IMAGE ? { width: 400, height: 300 } : 0,
        },
      ],
    }));
  };

  const handleContentChange = (index, value, dimensions) => {
    setCurrentQuestion((prev) => {
      const newContents = [...prev.contents];
      if (dimensions) {
        newContents[index] = { ...newContents[index], value, dimensions };
      } else {
        newContents[index] = { ...newContents[index], value };
      }
      return { ...prev, contents: newContents };
    });
  };

  const handleAddOption = () => {
    setCurrentQuestion((prev) => ({
      ...prev,
      options: [...prev.options, { contents: [] }],
    }));
  };

  const handleOptionContentChange = (optionIndex, contentIndex, value) => {
    setCurrentQuestion((prev) => {
      const newOptions = [...prev.options];
      const option = newOptions[optionIndex];
      const newContents = [...option.contents];
      newContents[contentIndex] = { ...newContents[contentIndex], value };
      newOptions[optionIndex] = { ...option, contents: newContents };
      return { ...prev, options: newOptions };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log("Current Question:", currentQuestion);
      await addDoc(
        collection(db, `exams/${examData.id}/questions`),
        currentQuestion,
      );
      setQuestions([...questions, currentQuestion]);
      setCurrentQuestion(defaultQuestionSchema);
    } catch (error) {
      console.error("Error adding question:", error);
    }
  };

  // Add this delete handler function near your other handlers
  const handleDeleteQuestion = async (questionId) => {
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, `exams/${examData.id}/questions/${questionId}`));
      
      // Update local state
      setQuestions(questions.filter(q => q.id !== questionId));
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  };

  // Get unique sections from questions
  const uniqueSections = [...new Set(questions?.map(q => q.metadata?.section))].filter(Boolean);

  console.log("questions", questions);
  return (
    <Container>
      <EditorSection>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="content-controls">
            <h3>Question Content</h3>
            <div className="flex gap-2">
              {Object.entries(CONTENT_TYPES)?.map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleAddContent(value)}
                  className="flex-1 px-3 py-1 border rounded bg-orange-500 text-white hover:bg-orange-600"
                  style={{
                    width: "20%",
                    textAlign: "center",
                    cursor: "pointer",
                    marginRight: "10px",
                    marginBottom: "10px",
                    backgroundColor: "#ffa600",
                  }}
                >
                  Add {key}
                </button>
              ))}
            </div>

            {currentQuestion.contents?.map((content, index) => (
              <div key={index} className="mt-2">
                {content.type === CONTENT_TYPES.IMAGE ? (
                  <div>
                    <input
                      type="text"
                      value={content.value}
                      onChange={(e) =>
                        handleContentChange(index, e.target.value)
                      }
                      placeholder="Image URL"
                      className="w-full p-2 border rounded"
                    />
                    <div className="flex gap-2 mt-1">
                      <input
                        type="number"
                        value={content.dimensions.width}
                        onChange={(e) =>
                          handleContentChange(index, content.value, {
                            ...content.dimensions,
                            width: Number(e.target.value),
                          })
                        }
                        placeholder="Width"
                        className="w-24 p-2 border rounded"
                      />
                      <input
                        type="number"
                        value={content.dimensions.height}
                        onChange={(e) =>
                          handleContentChange(index, content.value, {
                            ...content.dimensions,
                            height: Number(e.target.value),
                          })
                        }
                        placeholder="Height"
                        className="w-24 p-2 border rounded"
                      />
                    </div>
                  </div>
                ) : (
                  <textarea
                    value={content.value}
                    onChange={(e) => handleContentChange(index, e.target.value)}
                    className="w-full p-2 border rounded"
                    rows="3"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="options-section">
            <h3>Options</h3>
            <button
              type="button"
              onClick={handleAddOption}
              className="px-3 py-1 border rounded"
              style={{
                cursor: "pointer",
                marginBottom: "10px",
                width: "80%",
                backgroundColor: "#ffa600",
              }}
            >
              Add Option
            </button>

            {currentQuestion.options?.map((option, optIndex) => (
              <div key={optIndex} className="mt-2 p-2 border rounded">
                <div className="flex gap-2">
                  {Object.entries(CONTENT_TYPES)?.map(([key, value]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        const newOptions = [...currentQuestion.options];
                        newOptions[optIndex].contents.push({
                          type: value,
                          value: "",
                        });
                        setCurrentQuestion({
                          ...currentQuestion,
                          options: newOptions,
                        });
                      }}
                      className="px-2 py-1 border rounded text-sm"
                      style={{
                        width: "20%",
                        textAlign: "center",
                        cursor: "pointer",
                        marginRight: "10px",
                        marginBottom: "10px",
                        backgroundColor: "#ffa600",
                      }}
                    >
                      Add {key}
                    </button>
                  ))}
                </div>

                {option.contents?.map((content, contentIndex) => (
                  <div key={contentIndex} className="mt-2">
                    <textarea
                      value={content.value}
                      onChange={(e) =>
                        handleOptionContentChange(
                          optIndex,
                          contentIndex,
                          e.target.value,
                        )
                      }
                      className="w-full p-2 border rounded"
                      rows="2"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="metadata-section">
            <h3>Metadata</h3>
            <div className="grid grid-cols-2 gap-4">
              <select
                value={currentQuestion.metadata.section}
                onChange={(e) =>
                  setCurrentQuestion({
                    ...currentQuestion,
                    metadata: {
                      ...currentQuestion.metadata,
                      section: e.target.value,
                    },
                  })
                }
                className="p-2 border rounded"
              >
                <option value="">Select Section</option>
                {examData?.sections.map((section, index) => (
                  <option key={index} value={section}>
                    {examData?.subject.find((s) => s.id === section)?.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={currentQuestion.metadata.topic}
                onChange={(e) =>
                  setCurrentQuestion({
                    ...currentQuestion,
                    metadata: {
                      ...currentQuestion.metadata,
                      topic: e.target.value,
                    },
                  })
                }
                placeholder="Topic"
                className="p-2 border rounded"
                style={{ marginLeft: "10px" }}
              />
            
                {/* Question Type */}

            <select
              value={currentQuestion.type}
              onChange={(e) =>
                setCurrentQuestion({
                  ...currentQuestion,
                  type: e.target.value,
                })
              }
              className="p-2 border rounded"
              style={{ marginLeft: "10px" }}
            >
              <option value="">Select Question Type</option>
              <option value={QUESTION_TYPES.MCQ}>
                Multiple Choice (Single)
              </option>
              <option value={QUESTION_TYPES.MULTIPLE}>
                Multiple Choice (Multiple)
              </option>
              <option value={QUESTION_TYPES.INTEGER}>Integer Type</option>
              <option value={QUESTION_TYPES.NUMERICAL}>Numerical Type</option>
            </select>

            {/* Marks */}
            <div >
              <input
                type="number"
                value={currentQuestion.metadata.marks.correct}
                onChange={(e) =>
                  setCurrentQuestion({
                    ...currentQuestion,
                    metadata: {
                      ...currentQuestion.metadata,
                      marks: {
                        ...currentQuestion.metadata.marks,
                        correct: Number(e.target.value),
                      },
                    },
                  })
                }
                placeholder="Correct Marks"
                className="p-2 border rounded w-full"
              />
              <input
                type="number"
                value={currentQuestion.metadata.marks.incorrect}
                onChange={(e) =>
                  setCurrentQuestion({
                    ...currentQuestion,
                    metadata: {
                      ...currentQuestion.metadata,
                      marks: {
                        ...currentQuestion.metadata.marks,
                        incorrect: Number(e.target.value),
                      },
                    },
                  })
                }
                placeholder="Negative Marks"
                className="p-2 border rounded w-full"
                style={{ marginTop: "10px", marginLeft: "10px" }}
              />
            </div>

            {/* Correct Answer */}
            <input
              type="text"
              value={currentQuestion.correctAnswer}
              onChange={(e) =>
                setCurrentQuestion({
                  ...currentQuestion,
                  correctAnswer: e.target.value,
                })
              }
              placeholder="Correct Answer"
              className="p-2 border rounded"
              style={{ marginTop: "10px" }}
            />

            </div>
            
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-blue-500 text-white rounded"
            style={{
              cursor: "pointer",
              marginBottom: "10px",
              width: "80%",
              textAlign: "center",
              marginTop: "10px",
              backgroundColor: "#ffa600",
            }}
          >
            Add Question
          </button>
        </form>
      </EditorSection>

      <PreviewSection>
        <h2>Preview</h2>
        
        {/* Section Filter Dropdown */}
        <div className="mb-4">
          <select 
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="p-2 border rounded w-full"
          >
            <option value="all">All Sections</option>
            {uniqueSections.map((section, index) => (
              <option key={index} value={section}>
                {examData?.subject.find((s) => s.id === section)?.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filtered Questions */}
        {questions
          ?.filter(question => 
            selectedSection === "all" || 
            question.metadata?.section === selectedSection
          )
          .map((question, index) => (
            <div key={index} className="question-preview mb-4 p-4 border rounded">
                <h3 onClick={() => handleDeleteQuestion(question.id)} style={{cursor:'pointer'}}>Question {index + 1}</h3>
              <div className="contents mb-4">
                {question.contents?.map((content, i) => (
                  <ContentRenderer key={i} content={content} />
                ))}
              </div>

              <div className="options grid gap-2">
                {question.options?.map((option, optIndex) => (
                  <div key={optIndex} className="option p-2 border rounded">
                    {String.fromCharCode(65 + optIndex)}.{" "}
                    {option.contents?.map((content, i) => (
                      <ContentRenderer key={i} content={content} />
                    ))}
                  </div>
                ))}
              </div>

              <div className="metadata mt-2 text-sm text-gray-600">
Topic:{" "}{question.metadata?.topic} | Marks:{" "}
                {question.metadata?.marks?.correct} {" "} | Negative Marks:{" "}{question.metadata?.marks?.incorrect} | Correct Answer:{" "}{question.correctAnswer}
              </div>
            </div>
          ))}

      </PreviewSection>
    </Container>
  );
}

export default EditExamPage;
