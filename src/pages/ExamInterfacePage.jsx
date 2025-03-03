import React, { useState, useEffect, useRef } from 'react';
import { getExam } from '../services/questionService';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { useLocation } from 'react-router-dom';
import Katex from "@matejmazur/react-katex";
import "katex/dist/katex.min.css";
import { set } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { getExamQuestions, saveExamResult } from '../services/questionService';
const CONTENT_TYPES = {
  TEXT: "text",
  IMAGE: "image",
  LATEX: "latex",
  TABLE: "table",
};



// Styled Components
const ExamContainer = styled.div`
  font-family: OpenSans-Regular;
  font-size: 12px;
  overflow: hidden;
  margin: 0;
  padding: 0;
  display: flex;
`;

const Header1 = styled.div`
  font-family: Arial,Helvetica,sans-serif;
  font-size: 12px;
  background-color: #363636; 
  color: #f7f64e;
  padding: 8px 10px;
  overflow: auto;
`;

const LeftSection = styled.div`
  width: calc(100% - 250px);
  margin-right: 250px;
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

const Sidebar = styled.div`
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 250px;
  background: #fff;
  border-left: 1px solid #c3c3c1;
  overflow-y: auto;
`;

const ExamName = styled.div`
  background-color: #fff;
  padding: 10px;
  border-bottom: 1px solid #c3c3c1;
`;

const ExamNameText = styled.div`
  font-weight: bold;
  font-size: 14px;
`;

const TimeSection = styled.div`
  background-color: #fff;
  padding: 10px;
  border-bottom: 1px solid #c3c3c1;
`;

const TimeLeft = styled.div`
  float: right;
  font-weight: bold;
  color: ${props => props.timeLeft < 300 ? '#f44336' : 'inherit'}
`;

const SectionNames = styled.div`
  display: flex;
  flex-direction: row;
  background-color: #fff;
  border-bottom: 1px solid #c3c3c1;
  padding: 5px;
`;

const SectionItem = styled.div`
  flex: 1;
  padding: 8px;
  cursor: pointer;
  font-size: 13px;
  text-align: center;
  border-right: 1px solid #c3c3c1;
  
  &:last-child {
    border-right: none;
  }
  
  &.section_selected {
    background-color: #FF9800;
    color: white;
  }
  
  &.section_unselected {
    &:hover {
      background-color: #e6e6e6;
    }
  }
`;

const LanguageSelector = styled.div`
  display: flex;
  align-items: center;
  padding: 10px;
  background-color: #fff;
  border-bottom: 1px solid #c3c3c1;
  
  select {
    margin-left: 10px;
    padding: 3px;
  }
`;

const SectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #c3c3c1;
`;

const QuestionArea = styled.div`
  overflow: auto;
  flex: 1;
  height: calc(100vh - 200px);
  margin: 0;
  padding: 0;
`;

const QuestionTitle = styled.div`
  border-bottom: 1px solid #dbdbdb;
  font-weight: bold;
  padding: 7px;
  text-align: left;
  font-size: 17px;
`;

const NavigationButtons = styled.div`
  background: white;
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  border-top: 1px solid #c3c3c1;
  overflow: auto;
  padding-left: 10px;
`;

const Button = styled.div`
  color: #252525;
  background-color: #fff;
  border: 1px solid #c8c8c8;
  border-radius: 2px;
  display: inline-block;
  font-size: 15px;
  font-weight: 400;
  padding: 10px 20px;
  text-align: center;
  vertical-align: middle;
  margin: 8px 2px;
  float: left;
  font-family: arial,verdana,helvetica,sans-serif;
  cursor: pointer;

  &:hover {
    background-color: #FF9800;
    color: #FFFFFF;
    border-color: #0a68b4;
  }

  &#next {
    background-color: #FF9800;
    color: #FFFFFF;
    float: right;
    margin-right: 10px;
  }
`;

const QuestionBox = styled.div`
  padding: 3px;
  text-align: center;
  border: 1px solid #c3c3c1;
  cursor: pointer;
  font-size: 11px;
  
  &.a { 
    background-color: #4CAF50; 
    color: white; 
  }
  &.na { 
    background-color: #f44336; 
    color: white; 
  }
  &.nv { 
    background-color: #gray; 
  }
  &.mr { 
    background-color: #FF9800; 
    color: white; 
  }
  &.amr { 
    background-color: #9C27B0; 
    color: white; 
  }
`;

const PersonInfo = styled.div`
  padding: 10px;
  text-align: center;
  border-bottom: 1px solid #c3c3c1;
`;

const ProfileImage = styled.img`
  width: 50px;
  height: 50px;
  border-radius: 50%;
`;

const ColorInfo = styled.div`
  width: 100%;
  padding-left: 9px;
  padding-bottom: 12px;
  overflow: auto;
`;

const InfoItem = styled.div`
  width: 43%;
  margin-top: 10px;
  float: left;
  
  &.long {
    width: 86%;
  }
`;

const StatusIcon = styled.span`
  background: url("https://www.digialm.com/OnlineAssessment/images/questions-sprite.png");
  float: left;
  height: 26px;
  margin-right: 10px;
  width: 29px;
  color: #fff;
  padding-top: 6px;
  text-align: center;
  vertical-align: middle;
  font-family: Arial, Helvetica, sans-serif;
`;

const StatusText = styled.span`
  font-family: Arial, Helvetica, sans-serif;
`;

const QuestionPalette = styled.div`
  background: #e5f6fd;
  font-weight: bold;
  overflow: auto;
  padding: 10px;
  min-height: 183px;
`;

const PaletteHeader = styled.div`
  background: #4e85c5;
  color: #fff;
  padding: 10px;
  font-size: 16px;
  font-weight: bold;
`;

const ChooseText = styled.div`
  padding: 10px;
  font-weight: bold;
`;

const PaletteGrid = styled.div`
  margin-top: 12px;
  overflow: auto;
  display: inline-block;
`;

const QuestionNumber = styled.div`
  font-family: Arial, Helvetica, sans-serif;
  background: url("https://www.digialm.com/OnlineAssessment/images/questions-sprite.png");
  width: 49px;
  height: 33px;
  color: #fff;
  cursor: pointer;
  float: left;
  font-size: 16px;
  font-weight: normal;
  margin-right: 2px;
  text-align: center;
  padding-top: 12px;
  display: inline-block;
  
  &.a { 
    margin-bottom: 10px;
    background-position: -4px -5px;
    color: #ffffff;
    &:hover { background-position: -4px -126px; }
  }
  &.na { 
    margin-bottom: 10px;
    background-position: -57px -6px;
    color: #ffffff;
    &:hover { background-position: -57px -127px; }
  }
  &.nv { 
    margin-bottom: 10px;
    background-position: -157px -4px;
    color: #000000;
    &:hover { background-position: -157px -4px; }
  }
  &.mr { 
    margin-bottom: 0px;
    height: 40px;
    background-position: -108px -1px;
    padding-top: 15px;
    color: #ffffff;
    &:hover { background-position: -108px -122px; }
  }
  &.amr {
    margin-bottom: 0px;
    height: 40px;
    background-position: -66px -178px;
    padding-top: 15px;
    color: #ffffff;
  }
`;


const fetchExamData = async (examId) => {
  try {
   // Fetch exam data from DynamoDB
   const examData = await getExam(examId);

    // Fetch questions from DynamoDB using questionService
    const questions = await getExamQuestions(examId);
    
    // Transform DynamoDB response if needed
    const transformedQuestions = questions.map(question => ({
      id: question.id, // Extract ID from SK
      question: question.contents,
      options: question.options,
      metadata: question.metadata,
      correctAnswer: question.correctAnswer
    }));
    // Combine exam data with questions
    return {
      id: examId,
      ...examData,
      questions: transformedQuestions
    };

  } catch (error) {
    console.error('Error fetching exam data:', error);
    throw error;
  }
};

const Timer = styled.div`
  /* ... other styles ... */
  ${({ $timeLeft }) => `
    color: ${$timeLeft < 300 ? 'red' : 'inherit'};
  `}
`;

const WelcomeScreen = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: white;
  z-index: 1000;
`;

const StartButton = styled.button`
  padding: 12px 24px;
  background: #FF9800;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  
  &:hover {
    background: #F57C00;
  }
`;

// Modal component
const Modal = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1001;
`;

const ModalContent = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
`;

const ModalButton = styled.button`
  padding: 8px 16px;
  background: #FF9800;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  
  &:hover {
    background: #F57C00;
  }
`;

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

function ExamInterfacePage() {
  const location = useLocation();
  // const examData = location.state?.examData;
  const examId = location.pathname.split('/').pop();
  const [examData, setExamData] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentTopic, setCurrentTopic] = useState("");
  const { user } = useAuth();
  const [questionStatuses, setQuestionStatuses] = useState(new Map());
  const [timeLeft, setTimeLeft] = useState(examData?.duration * 60 || 3 * 60 * 60); // 3 hours in seconds
  const [subjects, setSubjects] = useState([]);
  const [questionsBySection, setQuestionsBySection] = useState(new Map());
  const [selectedAnswers, setSelectedAnswers] = useState(new Map());
  const [examStarted, setExamStarted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [answersObject, setAnswersObject] = useState({});
  const frameRef = useRef();
  const endTimeRef = useRef();
  const submitButtonRef = useRef(null);


// Add navigate hook
const navigate = useNavigate();

// Add modal component
const SubmitModal = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1001;
`;

const ModalContent = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
`;

const ModalButton = styled.button`
  padding: 8px 16px;
  background: #FF9800;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  
  &:hover {
    background: #F57C00;
  }
`;


  useEffect(() => {
    const loadExam = async () => {
      try {
        const data = await fetchExamData(examId);
        setExamData(data);
      } catch (err) {
        console.error('Error loading exam:', err);
      }
    };

    loadExam();
  }, [examId]);

  useEffect(() => {
    if (examData?.questions) {
      // Get unique sections from questions
      const uniqueSections = [...new Set(examData.questions.map(q => q.metadata.sectionName))];
      const topicsFromSections = uniqueSections.map(section => ({
        id: section,
        name: section
      })).filter(topic => topic.id); // Remove any undefined/null sections
  
      const questionMap = new Map();
    
    // Group questions by section
    examData.questions.forEach(question => {
      const section = question.metadata.sectionName;
      if (!questionMap.has(section)) {
        questionMap.set(section, []);
      }
      questionMap.get(section).push(question);
    });
    
    setQuestionsBySection(questionMap);
  
      setSubjects(topicsFromSections);
      loadTopic(topicsFromSections[0].id);
      // setTimeLeft(examData.duration * 60);
    }
  }, [examData]);

  useEffect(() => {
    // Set end time when exam starts examData?.duration ? examData.duration * 60 : 0
    endTimeRef.current = Date.now() + (examData?.duration ? examData.duration * 60 * 1000:0);
    
    function tick() {
      const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000);
      
      if (remaining <= 0) {
        submitButtonRef.current?.click();
        setTimeLeft(0);
        return;
      }
  
      setTimeLeft(remaining);
      frameRef.current = requestAnimationFrame(tick);
    }
  
    frameRef.current = requestAnimationFrame(tick);
  
    // Save to localStorage on each tick
    localStorage.setItem('examEndTime', endTimeRef.current.toString());
    
    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [examData?.duration]);

  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        const element = document.documentElement;
        
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) { // Safari
          await element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) { // IE11
          await element.msRequestFullscreen();
        }
      } catch (err) {
        console.log('Fullscreen error:', err);
      }
    };
  
    // Small delay to let the page load
    setTimeout(enterFullscreen, 1000);
  }, []);
  
  useEffect(() => {
    // Prevent page reload
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
  
    // Prevent keyboard shortcuts
    const handleKeyDown = (e) => {
      if (
        // Reload: Ctrl+R, Command+R, F5
        (e.key === 'r' && (e.ctrlKey || e.metaKey)) ||
        e.key === 'F5' ||
        // Forward/Back: Alt+Left/Right, Command+Left/Right
        ((e.altKey || e.metaKey) && ['ArrowLeft', 'ArrowRight'].includes(e.key))
      ) {
        e.preventDefault();
        return false;
      }
    };
  
    // Block right click
    const handleContextMenu = (e) => {
      e.preventDefault();
    };
  
    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);
  
    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // const startTimer = (duration) => {
  //   let time = examData?.duration ? examData.duration * 60 : 0;
    
  //   const timer = setInterval(() => {
  //     if (typeof time !== 'number' || isNaN(time)) {
  //       time = examData?.duration ? examData.duration * 60 : 0;
  //     }
  
  //     if (time >= 0) {
  //       if (time % 60 === 0 || time < 60) {
  //         setTimeLeft(time);
  //       }
  //       time--;
  //     }
  //     console.log('Time left:', time); // Debugging
  //   }, 1000);
  
  //   return () => clearInterval(timer);
  // };
  
  const loadTopic = async (topicId) => {
    setCurrentTopic(topicId);
    setCurrentSlide(0);
  };

  // Add this useEffect near other hooks
useEffect(() => {
  const enterFullscreen = async () => {
    const elem = document.documentElement;
    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const preventExit = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      enterFullscreen();
    }
  };

  // Enter fullscreen on mount
  enterFullscreen();
  
  // Prevent exit with Escape key
  document.addEventListener('keydown', preventExit);

  // Re-enter if user somehow exits
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      enterFullscreen();
    }
  });

  return () => {
    document.removeEventListener('keydown', preventExit);
    document.removeEventListener('fullscreenchange', enterFullscreen);
  };
}, []);

useEffect(() => {
  const handleFullscreenChange = () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      setShowModal(true);
    }
  };

  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowModal(true);
    }
  };

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('keydown', handleKeydown);

  return () => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.removeEventListener('keydown', handleKeydown);
  };
}, []);

  const calculateSectionMarks = () => {
    return Object.entries(answersObject).reduce((acc, [section, data]) => {
      acc[section] = {
        totalMarks: data.totalMarks || 0,
        positiveMarks: data.positiveMarks || 0,
        negativeMarks: data.negativeMarks || 0,
        attempted: data.attempted || 0,
        correct: data.correct || 0,
        incorrect: data.incorrect || 0
      };
      return acc;
    }, {});
  };

  const getAttemptedCount = () => {
    return Array.from(questionStatuses.values())
      .flat()
      .filter(status => status === 'a')
      .length;
  };

  const getMarkedForReviewCount = () => {
    return Array.from(questionStatuses.values())
      .flat()
      .filter(status => status === 'mr' || status === 'amr')
      .length;
  };

  const handleSubmit = async () => {
    try {
      const answersObject = {};
      const marksObject = {};
  
      console.log('Selected answers:', selectedAnswers);
      // Process each section
      selectedAnswers.forEach((sectionAnswers, section) => {
        // Convert answers Map to object
        answersObject[section] = Object.fromEntries(sectionAnswers);
        
        // Initialize marks for this section
        let positiveMarks = 0;
        let negativeMarks = 0;
        
        // Calculate marks for each answer
        sectionAnswers.forEach((answer, questionId) => {
          const question = questionsBySection.get(section)
            .find(q => q.id === questionId);
            
          if (question) {
            if (question.correctAnswer.toLowerCase().trim() === answer.toLowerCase().trim()) {
              positiveMarks += question.metadata?.marks?.correct || 0;
            } else {
              negativeMarks += question.metadata?.marks?.incorrect || 0;
            }
          }
        });
        negativeMarks =  negativeMarks<0?negativeMarks*=-1:negativeMarks=negativeMarks;
        // Store marks in answer object
        answersObject[section] = {
          ...answersObject[section],
          totalMarks: positiveMarks - negativeMarks,
          positiveMarks,
          negativeMarks
        };
      });
  
      const examResult = {
      examId,
      userId: user.uid,
      answers: answersObject,
      questionStatuses: Object.fromEntries(
        Array.from(questionStatuses.entries()).map(([topic, statusMap]) => [
          topic,
          Object.fromEntries(statusMap)
        ])
      ),
      sections: calculateSectionMarks(),
      statistics: {
        timeSpent: examData.duration * 60 - timeLeft,
        questionsAttempted: getAttemptedCount(),
        questionsMarkedForReview: getMarkedForReviewCount()
      },
      status: 'completed'
    };

    await saveExamResult(user.uid, examId, examResult);
    
  
      setTimeLeft(0);
      setAnswersObject(answersObject);
      setShowSubmitModal(true);
    } catch (error) {
      console.error('Error submitting exam:', error);
    }
  };

  const markAnswered = (questionIndex) => {
    setQuestionStatuses(prev => {
      const newStatuses = new Map(prev);
      if (!newStatuses.has(currentTopic)) {
        newStatuses.set(currentTopic, new Map());
      }
      newStatuses.get(currentTopic).set(questionIndex, 'a');
      return newStatuses;
    });
  };

  const markNotAnswered = (questionIndex) => {
    setQuestionStatuses(prev => {
      const newStatuses = new Map(prev);
      if (!newStatuses.has(currentTopic)) {
        newStatuses.set(currentTopic, new Map());
      }
      newStatuses.get(currentTopic).set(questionIndex, 'na');
      return newStatuses;
    });
  };

  const markForReview = (questionIndex) => {
    setQuestionStatuses(prev => {
      const newStatuses = new Map(prev);
      if (!newStatuses.has(currentTopic)) {
        newStatuses.set(currentTopic, new Map());
      }
      newStatuses.get(currentTopic).set(questionIndex, 'mr');
      return newStatuses;
    });
  };
  
  const markAnsweredAndReview = (questionIndex) => {
    setQuestionStatuses(prev => {
      const newStatuses = new Map(prev);
      if (!newStatuses.has(currentTopic)) {
        newStatuses.set(currentTopic, new Map());
      }
      newStatuses.get(currentTopic).set(questionIndex, 'amr');
      return newStatuses;
    });
  };

  const handleClearResponse = () => {
    // Get current section's questions
    const sectionQuestions = questionsBySection.get(currentTopic);
    
    if (sectionQuestions && sectionQuestions[currentSlide]) {
      // Clear selected answer from state
      setSelectedAnswers(prev => {
        const newAnswers = new Map(prev);
        if (newAnswers.has(currentTopic)) {
          const sectionAnswers = newAnswers.get(currentTopic);
          sectionAnswers.delete(sectionQuestions[currentSlide].id);
          if (sectionAnswers.size === 0) {
            newAnswers.delete(currentTopic);
          }
        }
        return newAnswers;
      });
  
      // Update question status
      setQuestionStatuses(prev => {
        const newStatuses = new Map(prev);
        if (!newStatuses.has(currentTopic)) {
          newStatuses.set(currentTopic, new Map());
        }
        newStatuses.get(currentTopic).set(currentSlide, 'na');
        return newStatuses;
      });
    }
  };

  const handleAnswerSelect = (e) => {
    if (e.target.checked) {
      markAnswered(currentSlide);
    }
  };

  const handleMarkForReview = () => {
    const hasAnswer = document.querySelector(`input[name="question${currentSlide + 1}"]:checked`);
    if (hasAnswer) {
      markAnsweredAndReview(currentSlide);
    } else {
      markForReview(currentSlide);
    }
    if(currentSlide+1<questionsBySection.get(currentTopic).length)
      setCurrentSlide(prev => prev + 1);
    else if(subjects.findIndex((topic) => topic.id === currentTopic)+1<subjects.length)
      {
        setCurrentSlide(0);
        loadTopic(subjects[subjects.findIndex((topic) => topic.id === currentTopic)+1].id);
      }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if(seconds>60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    else
    return `${secs.toString().padStart(2, '0')}`;
  };


const ContentRenderer = ({ content }) => {

  switch (content.type) {
    case CONTENT_TYPES.TEXT:
      return <span className="text-content">{content.value}</span>;
    case CONTENT_TYPES.LATEX:
      // return <Katex math={content.value} />;
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

const enterFullscreen = async () => {
  try {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { // Safari
      await elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { // IE11
      await elem.msRequestFullscreen();
    }
  } catch (error) {
    console.error('Fullscreen error:', error);
  }
};

  const renderMarksSummary = (answersObject) => {
    return Object.entries(answersObject).map(([section, data]) => (
      <div key={section} style={{ marginBottom: '10px' }}>
        <h3 style={{ fontWeight: 'bold', color: '#FF9800' }}>{section}</h3>
        <p>Total Marks: {data.totalMarks}</p>
        <p>Positive Marks: {data.positiveMarks}</p>
        <p>Negative Marks: {data.negativeMarks}</p>
      </div>
    ));
  };

  return (
    <>
      {!examStarted && (
        <WelcomeScreen>
          <h1>{examData?.name}</h1>
          <p>Duration: {examData?.duration} minutes</p>
          <StartButton 
            onClick={async () => {
              await enterFullscreen();
              setExamStarted(true);
              // startTimer(examData.duration);
            }}
          >
            Start Exam
          </StartButton>
        </WelcomeScreen>
      )}
      
      {examStarted && (
        <ExamContainer>
          <LeftSection>
            <header style={{ backgroundColor: "#000000" }}>
              <img 
                src="/zenithLogo.png" 
                height="50" 
                alt="Zenith Logo"
                style={{ margin: '5px 5px' }}
              />
            </header>

            <Header1>
              {examData?.name} 
              <div style={{ 
                color: '#FFFFFF',
                fontFamily: 'arial,verdana,helvetica,sans-serif',
                float: 'right',
                display: 'inline-block',
                margin: '0px 10px',
                fontWeight: 'bold'
              }}>
                <div>Instructions</div>
              </div>
              <div style={{ 
                color: '#FFFFFF',
                fontFamily: 'arial,verdana,helvetica,sans-serif',
                float: 'right',
                display: 'inline-block',
                margin: '0px 10px',
                fontWeight: 'bold'
              }}>
                <div>Question Paper</div>
              </div>
            </Header1>

            <ExamName>
              {/* <ExamNameText>{examData?.name || 'Joint Entrance Exam'}</ExamNameText> */}
            </ExamName>

            <TimeSection>
              {currentTopic || 'Section'}
              <Timer $timeLeft={timeLeft}>Time Left: {formatTime(timeLeft)}</Timer>
            </TimeSection>

            <SectionNames>
              {subjects.map((topic, index) => (
                <SectionItem 
                  key={topic.id}
                  className={currentTopic === topic.id ? 'section_selected' : 'section_unselected'}
                  onClick={() => loadTopic(topic.id)}
                >
                  {topic.name}
                </SectionItem>
              ))}
            </SectionNames>

            <QuestionArea>
              <QuestionTitle>
                <div>Question no. {currentSlide + 1}</div>
              </QuestionTitle>

              {/* Question content */}
              {questionsBySection?.get(currentTopic)?.length >= currentSlide+1 && (
                <div style={{ opacity: 1, zIndex: 2, position: 'relative' }}>
                  <div style={{ 
                    backgroundColor: '#ffffff',
                    fontSize: '19px',
                    marginBottom: '10px',
                    padding: '20px'
                  }}>
                    {questionsBySection.get(currentTopic)[currentSlide].question?.map((content, i) => (
                      <ContentRenderer key={i} content={content} />
                    ))}
                  </div>

                  <div style={{
                    backgroundColor: '#ffffff',
                    fontSize: '19px',
                    marginBottom: '20px',
                    textAlign: 'left',
                    display: 'inline-block',
                    padding: '10px'
                  }}>                
                  {questionsBySection.get(currentTopic)[currentSlide].options?.map((option, optIndex) => {
                    const questionId = questionsBySection.get(currentTopic)[currentSlide].id;
                    const currentValue = ['A', 'B', 'C', 'D'][optIndex];
                    const selectedValue = selectedAnswers.get(currentTopic)?.get(questionId);
                    return (
                      // Replace the existing option rendering code with this:
                      <div key={optIndex} style={{ 
                        display: 'flex', // Changed from 'block' to 'flex'
                        alignItems: 'center', // Align items vertically
                        gap: '8px', // Add space between radio and content
                        marginBottom: '10px'
                      }}>
                        <input 
                          type="radio" 
                          name={`question${currentSlide + 1}`}
                          value={currentValue}
                          checked={selectedValue === currentValue}
                          onChange={(e) => {
                            if (e.target.checked) {
                              markAnswered(currentSlide);
                              setSelectedAnswers(prev => {
                                const newAnswers = new Map(prev);
                                if (!newAnswers.has(currentTopic)) {
                                  newAnswers.set(currentTopic, new Map());
                                }
                                newAnswers.get(currentTopic).set(questionId, currentValue);
                                return newAnswers;
                              });
                            }
                          }}
                          style={{ flexShrink: 0 }} // Prevent radio button from shrinking
                        />                    
                        <div style={{ display: 'inline-block' }}> {/* Wrap content in a div */}
                          {option.contents?.map((content, i) => (
                            <ContentRenderer key={i} content={content} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </QuestionArea>

            <NavigationButtons>
              <Button onClick={handleMarkForReview}>
                Mark for Review & Next
              </Button>
              <Button onClick={handleClearResponse}>
                Clear Response
              </Button>
              <Button 
                style={{ opacity: currentSlide === 0 ? 0 : 1 }}
                onClick={() => setCurrentSlide(prev => prev - 1)}
              >
                Previous
              </Button>
              <Button id="next" onClick={() => {
                let hasAnswer = document.querySelector(`input[name="question${currentSlide + 1}"]:checked`);
                if (hasAnswer) {
                  markAnswered(currentSlide);
                }
                else {
                  markNotAnswered(currentSlide);
                }
                if(currentSlide+1<questionsBySection.get(currentTopic).length)
                  setCurrentSlide(prev => prev + 1);
                else if(subjects.findIndex((topic) => topic.id === currentTopic)+1<subjects.length)
                  {
                    setCurrentSlide(0);
                    loadTopic(subjects[subjects.findIndex((topic) => topic.id === currentTopic)+1].id);
                  }
                  hasAnswer = document.querySelector(`input[name="question${currentSlide + 2}"]:checked`);
                  if (hasAnswer) {
                    markAnswered(currentSlide+1);
                  }
                  else {
                    markNotAnswered(currentSlide+1);
                  }
              }}>
                Save and Next
              </Button>
            </NavigationButtons>
          </LeftSection>

          <Sidebar>
            <PersonInfo>
              <ProfileImage 
                src="https://www.digialm.com//OnlineAssessment/images/NewCandidateImage.jpg" 
                alt="Profile"
              />
              <div id="cname">{user.email}</div>
            </PersonInfo>
            
            <ColorInfo>
              <InfoItem>
                <StatusIcon style={{ backgroundPosition: "-7px -55px" }} />
                <StatusText>Answered</StatusText>
              </InfoItem>
              <InfoItem>
                <StatusIcon style={{ backgroundPosition: "-42px -56px" }} />
                <StatusText>Not Answered</StatusText>
              </InfoItem>
              <InfoItem>
                <StatusIcon style={{ backgroundPosition: "-107px -56px" }} />
                <StatusText>Not Visited</StatusText>
              </InfoItem>
              <InfoItem>
                <StatusIcon style={{ backgroundPosition: "-75px -54px" }} />
                <StatusText>Marked for Review</StatusText>
              </InfoItem>
              <InfoItem className="long">
                <StatusIcon style={{ backgroundPosition: "-9px -87px" }} />
                <StatusText>
                  Answered & Marked for Review (will be considered for evaluation)
                </StatusText>
              </InfoItem>
            </ColorInfo>

            <div>
              <PaletteHeader>
                {currentTopic || 'Section'}
              </PaletteHeader>
              <QuestionPalette>
                <ChooseText>Choose a Question</ChooseText>
                <PaletteGrid>
                  {Object.keys(questionsBySection.get(currentTopic) || {}).map((_, index) => {
                    const status = questionStatuses.get(currentTopic)?.get(index) || 'nv';
                    return (
                      <QuestionNumber 
                        key={index} 
                        className={status}
                        onClick={() => {
                          if (status === 'nv') {
                            markNotAnswered(index);
                          }
                          setCurrentSlide(index);
                        }}
                        style={{
                          borderLeft: currentSlide === index ? '1px solid #3b82f6' : 'none',
                          borderRight: currentSlide === index ? '1px solid #3b82f6' : 'none',
                          // paddingLeft: currentSlide === index ? '2px' : '0',
                          //</PaletteGrid> paddingRight: currentSlide === index ? '2px' : '0',
                          //</QuestionPalette> margin: currentSlide === index ? '0 -1px' : '0' // Compensate for borders
                        }}
                      >
                        {index + 1}
                      </QuestionNumber>
                    );
                  })}
                </PaletteGrid>
              </QuestionPalette>
            </div>

            <div style={{ 
              position: 'absolute', 
              bottom: '0', 
              width: '100%', 
              padding: '10px',
              borderTop: '1px solid #c3c3c1' 
            }}>
              <Button style={{ width: '50%' }}
              ref={submitButtonRef}
              onClick={()=>{
                console.log(selectedAnswers);
                handleSubmit();
              }}
              >Submit</Button>
            </div>
          </Sidebar>
        </ExamContainer>
      )}

      {showModal && (
      <Modal>
        <ModalContent>
          <p>You are not allowed to escape fullscreen mode.</p>
          <ModalButton 
            onClick={async () => {
              await enterFullscreen();
              setShowModal(false);
            }}
          >
            OK
          </ModalButton>
        </ModalContent>
      </Modal>
    )}

      {showSubmitModal && (
      <SubmitModal>
        <ModalContent>
          <h2>Submission Summary</h2>
          {renderMarksSummary(answersObject)}
          <ModalButton 
            onClick={() => navigate('/')}
          >
            OK
          </ModalButton>
        </ModalContent>
      </SubmitModal>
    )}
    </>
  );
}

export default ExamInterfacePage;
