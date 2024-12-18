import React, { useState, useEffect } from 'react';
import { collection, getDocs, getDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { useLocation } from 'react-router-dom';
import Katex from "@matejmazur/react-katex";
import "katex/dist/katex.min.css";
import { set } from 'firebase/database';

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
  height: 183px;
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
    // Fetch exam data
    const examRef = doc(db, 'exams', examId);
    const examSnapshot = await getDoc(examRef);
    
    if (!examSnapshot.exists()) {
      throw new Error('Exam not found');
    }

    // Fetch questions
    const questionsRef = collection(db, `exams/${examId}/questions`);
    const questionsSnapshot = await getDocs(questionsRef);
    
    const questions = questionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Combine exam data with questions
    return {
      id: examId,
      ...examSnapshot.data(),
      questions: questions
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

function ExamInterfacePage() {
  const location = useLocation();
  // const examData = location.state?.examData;
  const examId = location.pathname.split('/').pop();
  const [examData, setExamData] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [questions, setQuestions] = useState({});
  const [topics, setTopics] = useState([]);
  const [currentTopic, setCurrentTopic] = useState("");
  const { user } = useAuth();
  const [questionStatuses, setQuestionStatuses] = useState(new Map());
  const [timeLeft, setTimeLeft] = useState(examData?.duration * 60 || 3 * 60 * 60); // 3 hours in seconds
  const [subjects, setSubjects] = useState([]);
  const [questionsBySection, setQuestionsBySection] = useState(new Map());
  const [selectedAnswers, setSelectedAnswers] = useState(new Map());

  // Sample questions data
  const sampleQuestions = {
    1: {
      id: 'q1',
      q: 'A particle moves in a straight line with constant acceleration. If the initial velocity is u and after time t the velocity becomes v, then the displacement s of the particle is given by:',
      o1: 's = ut + (1/2)at²',
      o2: 's = vt - (1/2)at²',
      o3: 's = ((v+u)/2)t',
      o4: 's = vt + (1/2)at²',
      ans: 'C',
      f: false
    },
    2: {
      id: 'q2',
      q: 'The value of g (acceleration due to gravity) at a height h above the earths surface is related to g₀ (the value of g at the surface) by the equation:',
      o1: 'g = g₀(R/(R+h))²',
      o2: 'g = g₀(R+h/R)²',
      o3: 'g = g₀(R-h/R)²',
      o4: 'g = g₀(R/R-h)²',
      ans: 'A',
      f: false
    },
    3: {
      id: 'q3',
      q: 'A body is thrown vertically upward with an initial velocity u. The time taken by the body to return to the point of projection is:',
      o1: 'u/g',
      o2: '2u/g',
      o3: '3u/g',
      o4: '4u/g',
      ans: 'B',
      f: false
    }
  };

  useEffect(() => {
    const loadExam = async () => {
      try {
        const data = await fetchExamData(examId);
        setExamData(data);
        console.log('Exam data loaded:', data); // Debugging
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
    console.log('Questions by section:', Object.fromEntries(questionMap)); // For debugging
  
      setSubjects(topicsFromSections);
      loadTopic(topicsFromSections[0].id);
      setTimeLeft(examData.duration * 60);
    }
  }, [examData]);

  useEffect(() => {
    let time=-10;
    const timer = setInterval(() => {
      if(time<=-10)
      {
        time=examData?.duration * 60;
      }
      if(time%60==0||time<60)
        setTimeLeft(time);
      time--;
    }, 1000);

    // Cleanup on component unmount
    return () => clearInterval(timer);
  }, []);

  const loadTopic = async (topicId) => {
    setQuestions(sampleQuestions);
    setCurrentTopic(topicId);
    setCurrentSlide(0);
  };

  
const handleSubmit = async () => {
  try {
    const statusesObject = Object.fromEntries(
      Array.from(questionStatuses.entries()).map(([topic, statusMap]) => [
        topic,
        Object.fromEntries(statusMap)
      ])
    );
    
    const examResultsRef = doc(db, 'examResults', `${examId}_${user.uid}`);
    await setDoc(examResultsRef, {
      examId,
      userId: user.uid,
      answers: Object.fromEntries(selectedAnswers),
      questionStatuses: statusesObject,
      submittedAt: new Date()
    }, { merge: true });
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
        newAnswers.delete(sectionQuestions[currentSlide].id);
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

  return (
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
                {questionsBySection.get(currentTopic)[currentSlide].contents?.map((content, i) => (
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
              {questionsBySection.get(currentTopic)[currentSlide].options?.map((option, optIndex) => (
                  <div key={optIndex} style={{ display: 'block', marginBottom: '10px' }}>
                    <input 
                      type="radio" 
                      name={`question${currentSlide + 1}`}
                      value={['A', 'B', 'C', 'D'][optIndex]}
                      checked={selectedAnswers.get(questionsBySection.get(currentTopic)[currentSlide].id) === ['A', 'B', 'C', 'D'][optIndex]}
                      onChange={(e) => {
                        if (e.target.checked) {
                          markAnswered(currentSlide);
                        }
                        setSelectedAnswers(prev => {
                          const newAnswers = new Map(prev);
                          newAnswers.set(questionsBySection.get(currentTopic)[currentSlide].id, e.target.value);
                          return newAnswers;
                        });
                      }}
                    />                    
                    {option.contents?.map((content, i) => (
                      <ContentRenderer key={i} content={content} />
                    ))}
                  </div>
                ))}
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
            const hasAnswer = document.querySelector(`input[name="question${currentSlide + 1}"]:checked`);
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
          <div id="cname">Zenith Student</div>
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
          onClick={handleSubmit}
          >Submit</Button>
        </div>
      </Sidebar>
    </ExamContainer>
  );
}

export default ExamInterfacePage;

