// src/pages/EditExamPage.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import { getExamQuestions, saveQuestion, deleteQuestion } from "../services/questionService";
import { useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import Katex from "@matejmazur/react-katex";
import "katex/dist/katex.min.css";
import { collection, getDocs, addDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/config";


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

const EditExamPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(defaultQuestionSchema);
  const [selectedSection, setSelectedSection] = useState("all");
  const examData = location.state?.examData;

  // Topic selection handler
  const handleTopicSelect = (topic) => {
    setCurrentQuestion(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        topic: topic
      }
    }));
  };

  // Fetch questions from DynamoDB when examData is loaded
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        if (examData?.id) {
          const fetched = await getExamQuestions(examData.id);
          setQuestions(fetched);
        }
      } catch (error) {
        console.error("Error fetching questions:", error);
      }
    };
    fetchQuestions();
  }, [examData?.id]);

  // ...existing code...
  const handleAddContent = (type) => {
    setCurrentQuestion((prev) => ({
      ...prev,
      contents: [
        ...(Array.isArray(prev.contents) ? prev.contents : []),
        {
          type,
          value: "",
          dimensions: type === CONTENT_TYPES.IMAGE ? { width: 400, height: 300 } : 0,
        },
      ],
    }));
  };
// ...existing code...

  const handleContentChange = (index, value, dimensions) => {
    setCurrentQuestion((prev) => {
      const newContents = [
        ...(Array.isArray(prev.contents) ? prev.contents : []),
      ];      if (dimensions) {
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
      options: [
        ...(Array.isArray(prev.options) ? prev.options : []),
        { contents: [] },
      ],    }));
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

  // Example: Save or update question
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Generate an ID if needed
      const questionId = currentQuestion.id || Date.now().toString();
      const questionWithId = {
        ...currentQuestion,
        id: questionId,
      };

      console.log("Saving question:", questionWithId);
      console.log("Exam ID:", examData.id);

      // Save to DynamoDB
      await saveQuestion(examData.id, questionWithId);

      // Update local state
      setQuestions((prev) => [
        ...prev.filter((q) => q.id !== questionId),
        questionWithId,
      ]);

      // Reset form
      setCurrentQuestion(defaultQuestionSchema);
    } catch (error) {
      console.error("Error saving question:", error);
    }
  };

  // Example: Delete question
  const handleDeleteQuestion = async (questionId) => {
    try {
      await deleteQuestion(examData.id, questionId);
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  };

  // Get unique sections from questions
  const uniqueSections = [...new Set(questions?.map(q => q.metadata?.section))].filter(Boolean);


  const TopicAutocomplete = ({ onSelect, initialValue }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(initialValue || '');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);
    const [topics, setTopics] = useState([]);

// Add after other useEffects
    useEffect(() => {
      const fetchTopics = async () => {
        try {
          const topicsSnapshot = await getDocs(collection(db, 'topics'));
          const topicsList = topicsSnapshot.docs.map(doc => doc.data().name);
          setTopics(topicsList);
        } catch (error) {
          console.error("Error fetching topics:", error);
        }
      };

      fetchTopics();
    }, []);
  
    const filteredTopics = useMemo(() => 
      topics.filter(topic => 
        topic.toLowerCase().includes(inputValue.toLowerCase())
      ),
      [inputValue]
    );

    // Add click outside handler
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
            inputRef.current && !inputRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };
  
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
  
    const handleSelect = (topic) => {
      setInputValue(topic);
      setIsOpen(false);
      onSelect(topic);
    };
  
    return (
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={(e) => {
            // Don't close if clicking on dropdown
            if (!dropdownRef.current?.contains(e.relatedTarget)) {
              setTimeout(() => setIsOpen(false), 200);
            }
          }}
          placeholder="Search or select topic..."
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        />
        {isOpen && (
          <ul
            ref={dropdownRef}
            style={{
              position: 'absolute',
              width: '100%',
              maxHeight: '200px',
              overflowY: 'auto',
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderTop: 'none',
              borderRadius: '0 0 4px 4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              zIndex: 1000,
              margin: 0,
              padding: 0,
              listStyle: 'none'
            }}
          >
            {filteredTopics.map((topic, index) => (
              <li
                key={topic}
                onClick={() => handleSelect(topic)}
                style={{
                  padding: '8px',
                  cursor: 'pointer',
                  backgroundColor: index === highlightedIndex ? '#f0f0f0' : 'white'
                }}
              >
                {topic}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

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
                      sectionName: examData?.subject.find( s => s.id === e.target.value)?.name,
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

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>
                  Topic *
                  <TopicAutocomplete 
                    onSelect={handleTopicSelect}
                    initialValue={currentQuestion?.metadata?.topic || ''}
                  />
                </label>
              </div>


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

            {/* Difficulty */}
            <select
              value={currentQuestion.metadata.difficulty}
              onChange={(e) =>
                setCurrentQuestion({
                  ...currentQuestion,
                  metadata: {
                    ...currentQuestion.metadata,
                    difficulty: e.target.value,
                  },
                })
              }
              className="p-2 border rounded"
              style={{ marginLeft: "10px" }}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>


            {/* Marks */}
            <div >
              <input
                type="number"
                value={currentQuestion.metadata.marks?.correct}
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
                value={currentQuestion.metadata.marks?.incorrect}
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
              value={currentQuestion?.correctAnswer}
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
              <div className="contents mb-4" onClick={() => setCurrentQuestion(question)}>
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
                {question.metadata?.marks?.correct} {" "} | Negative Marks:{" "}{question.metadata?.marks?.incorrect} | Correct Answer:{" "}{question?.correctAnswer}
              </div>
            </div>
          ))}

      </PreviewSection>
    </Container>
  );
}

export default EditExamPage;
