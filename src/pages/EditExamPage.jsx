// src/pages/EditExamPage.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { getExamQuestions, saveQuestion, deleteQuestion, getExamQuestionsByTopicAndDifficulty, saveExamQuestion, getTopics } from "../services/questionService";
import { useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import Katex from "@matejmazur/react-katex";
import "katex/dist/katex.min.css";
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

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
  width: 40%;
  padding: 20px;
  border-right: 1px solid #e2e8f0;
  overflow-y: auto;
`;

const PreviewSection = styled.div`
  width: 50%;
  padding: 20px;
  overflow-y: auto;

  .solution-preview {
    margin-top: 2px;
    padding: 5px;
    border-top: 2px solid #e2e8f0;
  }
`;

const defaultQuestionSchema = {
  contents: [],
  type: QUESTION_TYPES.MCQ,
  options: [],
  correctAnswer: "",
  solutionContent: [],
  metadata: {
    section: "",
    topic: "",
    difficulty: "medium",
    marks: { correct: 4, incorrect: -1 },
  },
};

const LatexRenderer = ({ content }) => {
  // Split content by LaTeX delimiters
  const parts = content.split(/(\$[^\$]+\$|\\\\)/g);
  
  return (
    <div className="latex-content">
      {parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          // Inline math
          return (
            <Katex
              key={index}
              math={part.slice(1, -1)}
              settings={{ throwOnError: false }}
            />
          );
        } else if (part === '\\\\') {
          // Line break
          return <br key={index} />;
        } else {
          // Regular text with possible LaTeX commands
          return <span key={index}>{part}</span>;
        }
      })}
    </div>
  );
};

const ContentRenderer = ({ content }) => {
  switch (content.type) {
    case CONTENT_TYPES.TEXT:
      return <span className="text-content">{content.value}</span>;
    case CONTENT_TYPES.LATEX:
      return <LatexRenderer content={content.value} />;
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
  const [selectedDifficulty, setSelectedDifficulty] = useState("medium");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [fileredQuestions, setFilteredQuestions] = useState([]);
  const examData = location.state?.examData;
  const [topics, setTopics] = useState([]);
  const [expandedSolutionId, setExpandedSolutionId] = useState(null);

    const fetchTopics = useCallback(async () => {
      try {
        const topicsList = await getTopics();
        setTopics(topicsList.map((topic) => topic.topicName));
      } catch (error) {
        console.error("Error fetching topics:", error);
      }
    }, []); 
    
    useEffect(() => {
      if (topics?.length === 0) {
        fetchTopics();
      }
    }, []);

  // Topic selection handler
  const handleTopicSelect = (topic) => {
    setCurrentQuestion(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        topic: topic
      }
    }));
    setSelectedTopic(topic);
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

  // Filter questions by topic and difficulty
  useEffect(() => {
    const fetchFilteredQuestions = async () => {
      try {
        if (selectedTopic && selectedDifficulty) {
          const fetched = await getExamQuestionsByTopicAndDifficulty(selectedTopic, selectedDifficulty);
          setFilteredQuestions(fetched);
        }
      } catch (error) {
        console.error("Error fetching filtered questions:", error);
      }
    };
    fetchFilteredQuestions();
  }, [selectedTopic, selectedDifficulty]);

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

  const handleImageUpload = async (file, index) => {
    try {
      // Create storage reference
      const storageRef = ref(storage, `exam-questions/${file.name}_${Date.now()}`);
      
      // Upload file
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      // Monitor upload
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload progress:', progress);
        },
        (error) => {
          console.error('Error uploading image:', error);
        },
        async () => {
          // Get download URL
          const downloadURL = await getDownloadURL(storageRef);
          
          // Update question content with URL
          handleContentChange(index, downloadURL);
        }
      );
  
    } catch (error) {
      console.error('Error handling image upload:', error);
    }
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

  const createQuestion = async (ans) => {
    debugger;
    if(ans.length === 0 || ans.length %5) 
      return;

    for(let i = 0; i < ans.length; i+=5) {
      const questionId = Date.now().toString();
      const questionObject = {
      id: questionId,
      type: "single",
      contents: [
        {
          type: "latex",
          value: ans[i],
          dimensions: 0
        }
      ],
      options: [
        {
          contents: [{ type: "latex", value: ans[i+1] }]
        },
        {
          contents: [{ type: "latex", value: ans[i+2] }]
        },
        {
          contents: [{ type: "latex", value: ans[i+3] }]
        },
        {
          contents: [{ type: "latex", value: ans[i+4] }]
        }
      ],
      correctAnswer: "b",
      metadata: {
        difficulty: "medium",
        marks: {
          correct: 4,
          incorrect: -1
        },
        section: "",
        topic: "Free Body Diagram"
      },
      solutionContent: []
    };
    await saveQuestion(examData.id, questionObject);
    // Set as current question
    setQuestions((prev) => [
      ...prev.filter((q) => q.id !== questionId),
      questionObject,
    ]);

  }
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

      // Save to DynamoDB
      console.log("Saving question:", questionWithId);
      await saveQuestion(examData.id, questionWithId);
      console.log(questionWithId);
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
  const uniqueSections = [...new Set(questions?.map(q => q?.metadata?.section))].filter(Boolean);


  const TopicAutocomplete = ({ onSelect, initialValue }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(initialValue || '');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);
  
    const filteredTopics = topics.filter((topic) => 
      topic.toLowerCase().includes(inputValue.toLowerCase())
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
            width: '40%',
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

  const toggleSolution = (questionId) => {
    console.log('Toggling solution for question:', questionId);
    setExpandedSolutionId(expandedSolutionId === questionId ? null : questionId);
  };

  return (
    <Container>
      <EditorSection>
        <form onSubmit={handleSubmit} className="space-y-4">

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
              onChange={(e) =>{
                setCurrentQuestion({
                  ...currentQuestion,
                  metadata: {
                    ...currentQuestion.metadata,
                    difficulty: e.target.value,
                  },
                });
                setSelectedDifficulty(e.target.value);

              }
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

            <input
              type="text"
              // value={currentQuestion?.correctAnswer}
              onChange={(e) =>
              {
                let ans = e.target.value;
                console.log(ans);
                ans = ans.replace(/Q\.\s*\d+\s*/, '');
                console.log(ans);
                const ansArray = ans.split('\\\\'); // Only split on double backslashes
                console.log(ansArray);
                ans = ansArray.map((element) => {
                  return element.replace(/\/\//g, '/');
                });
                ans.forEach((element) => {
                  console.log(element);
                });
                // drop the last element of the array if it's empty
                if(ans[ans.length - 1] === '') {
                  ans.pop();
                }
                createQuestion(ans);
              }
              }
              placeholder="Question"
              className="p-2 border rounded"
              style={{ marginTop: "10px" }}
            />

            </div>
            
          </div>

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
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          handleImageUpload(file, index);
                        }
                      }}
                      className="w-full p-2 border rounded"
                    />

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

          <div className="solution-section mt-6 border-t pt-4">
            
              <span style={{fontSize:"14px", fontWeight:"bold"}}>
                Solution 
              </span>

            
            <div className={`
              content-controls mt-2
            `}>
              <div className="flex gap-2">
                {Object.entries(CONTENT_TYPES)?.map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setCurrentQuestion({
                        ...currentQuestion,
                        solutionContent: [
                          ...(currentQuestion.solutionContent || []),
                          {
                            type: value,
                            value: "",
                            dimensions: value === CONTENT_TYPES.IMAGE ? { width: 300, height: 200 } : undefined
                          },
                        ],
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

              {currentQuestion.solutionContent?.map((content, index) => (
                <div key={index} className="mt-2">
                  {content.type === CONTENT_TYPES.IMAGE ? (
                    <div>
                      <input
                        type="text"
                        value={content.value}
                        onChange={(e) => {
                          const newContents = [...currentQuestion.solutionContent];
                          newContents[index] = {
                            ...content,
                            value: e.target.value,
                          };
                          setCurrentQuestion({
                            ...currentQuestion,
                            solutionContent: newContents,
                          });
                        }}
                        placeholder="Image URL"
                        className="w-full p-2 border rounded"
                      />
                      <div className="flex gap-2 mt-1">
                        <input
                          type="number"
                          value={content.dimensions?.width || ''}
                          onChange={(e) => {
                            const newContents = [...currentQuestion.solutionContent];
                            newContents[index] = {
                              ...content,
                              dimensions: {
                                ...content.dimensions,
                                width: Number(e.target.value),
                              },
                            };
                            setCurrentQuestion({
                              ...currentQuestion,
                              solutionContent: newContents,
                            });
                          }}
                          placeholder="Width"
                          className="w-24 p-2 border rounded"
                        />
                        <input
                          type="number"
                          value={content.dimensions?.height || ''}
                          onChange={(e) => {
                            const newContents = [...currentQuestion.solutionContent];
                            newContents[index] = {
                              ...content,
                              dimensions: {
                                ...content.dimensions,
                                height: Number(e.target.value),
                              },
                            };
                            setCurrentQuestion({
                              ...currentQuestion,
                              solutionContent: newContents,
                            });
                          }}
                          placeholder="Height"
                          className="w-24 p-2 border rounded"
                        />
                      </div>
                    </div>
                  ) : (
                    <textarea
                      value={content.value}
                      onChange={(e) => {
                        const newContents = [...currentQuestion.solutionContent];
                        newContents[index] = {
                          ...content,
                          value: e.target.value,
                        };
                        setCurrentQuestion({
                          ...currentQuestion,
                          solutionContent: newContents,
                        });
                      }}
                      className="w-full p-2 border rounded"
                      rows="3"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="options-section">
            <span style={{fontSize:"14px",fontWeight:"bold"}}>Options</span>
            <button
              type="button"
              onClick={handleAddOption}
              className="px-3 py-1 border rounded"
              style={{
                cursor: "pointer",
                width: "20%",
                backgroundColor: "#ffa600",
                marginBottom: "2vh",
                marginLeft: "1vw", 
                marginTop: "2vh"
              }}
            >
              Add Option
            </button>

            {currentQuestion.options?.map((option, optIndex) => (
              <div key={optIndex} className="mt-2 p-2 border rounded" style={{marginBottom: '1vh'}}>
                <div className="flex gap-2">
                  {/* <span>{String.fromCharCode(65 + optIndex)}.</span>   */}
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
              {/* Question content */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => {
                    setQuestions(prevQuestions => 
                      prevQuestions.filter(q => q.id !== question.id)
                    );
                    saveExamQuestion(examData.id, question.id, "rm");
                  }}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span onClick={() => handleDeleteQuestion(question.id)} style={{cursor:'pointer', fontSize:'16px', fontWeight: 'bold', marginTop: '20vh'}}>Question {index + 1}</span>
              </div>
              <div className="contents mb-4" onClick={() => setCurrentQuestion(question)}>                {question?.contents?.map((content, i) => (
                  <ContentRenderer key={i} content={content} />
                ))}
              </div>

              {/* Options */}
              <div className="options-list mb-4">
                {question?.options?.map((option, optIndex) => (
                  <div className="flex items-start gap-2">
                  {/* <span className="option-label mt-1">
                    {String.fromCharCode(65 + optIndex)}.
                  </span> */}
                  <div className="option-content flex-1">
                    {option.contents?.map((content, i) => (
                      <ContentRenderer 
                        key={i} 
                        content={content}
                        className="inline-block"
                      />
                    ))}
                  </div>
                </div>
                ))}
              </div>

              {/* Solution Toggle */}
              {question.solutionContent?.length > 0 && (
                <div className="solution-container border-t mt-4">
                  <div 
                    onClick={() => toggleSolution(question.id)}
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <span className="text-sm font-semibold">
                      Solution {expandedSolutionId === question.id ? '▼' : '▶'}
                    </span>
                  </div>
                  
                  <div className={`
                    solution-content
                    transition-all duration-300 ease-in-out
                    ${expandedSolutionId === question.id 
                      ? 'max-h-[500px] opacity-100' 
                      : 'max-h-0 opacity-0 overflow-hidden'}
                  `}>
                    <div className="p-3 bg-gray-50 rounded mt-2">
                      {expandedSolutionId === question.id && question.solutionContent?.map((content, i) => (
                        <ContentRenderer key={i} content={content} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

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
