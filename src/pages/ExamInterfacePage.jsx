import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { useLocation } from 'react-router-dom';

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

const QuestionText = () => {
  return (
    <div>
      {/* For inline equations */}
      <p>
        The equation <InlineMath math="E = mc^2"/> represents...
      </p>
      
      {/* For block equations */}
      <BlockMath math="\int_0^\infty x^2 dx"/>
      
      {/* For mixed content */}
      <p>
        Given the quadratic equation <InlineMath math="ax^2 + bx + c = 0"/>, 
        find the roots using:
        <BlockMath math="\frac{-b \pm \sqrt{b^2-4ac}}{2a}"/>
      </p>
    </div>
  );
};

const ExamHeader = ({ examData }) => {
  if (!examData) return null;
  return (
    <div className="exam-header">
      <h2>{examData.name}</h2>
      <p>{examData.description}</p>
      <div>
        <span>Code: {examData.code}</span>
        <span>Status: {examData.status}</span>
      </div>
    </div>
  );
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
  let examData = {};
  const [currentSlide, setCurrentSlide] = useState(0);
  const [questions, setQuestions] = useState({});
  const [topics, setTopics] = useState([]);
  const [currentTopic, setCurrentTopic] = useState("");
  const { user } = useAuth();
  const [questionStatuses, setQuestionStatuses] = useState({});
  const [timeLeft, setTimeLeft] = useState(examData?.duration * 60 || 3 * 60 * 60); // 3 hours in seconds

  // Sample topics data
  const sampleTopics = [
    { id: 'physics', name: 'Physics' },
    { id: 'chemistry', name: 'Chemistry' },
    { id: 'maths', name: 'Mathematics' }
  ];

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
    // Use sample topics instead of fetching
    setTopics(sampleTopics);
    // Load initial topic
    if (sampleTopics.length > 0) {
      loadTopic(sampleTopics[0].id);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 0) {
          clearInterval(timer);
          // Handle exam completion here
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    // Cleanup on component unmount
    return () => clearInterval(timer);
  }, []);

  const loadTopic = async (topicId) => {
    // Use sample questions instead of fetching
    setQuestions(sampleQuestions);
    setCurrentTopic(topicId);
    setCurrentSlide(0);
  };

  const handleSaveQuestion = async () => {
    try {
      const currentQuestion = questions[currentSlide + 1];
      if (currentQuestion) {
        const questionRef = doc(db, 'topics', currentTopic, 'questions', currentQuestion.id);
        const isSaved = currentQuestion.f;
        
        await updateDoc(questionRef, {
          f: !isSaved
        });

        // Update local state
        setQuestions(prev => ({
          ...prev,
          [currentSlide + 1]: {
            ...prev[currentSlide + 1],
            f: !isSaved
          }
        }));
      }
    } catch (error) {
      console.error("Error saving question:", error);
    }
  };

  const markAnswered = (questionIndex) => {
    setQuestionStatuses(prev => ({
      ...prev,
      [questionIndex]: 'a'
    }));
  };

  const markNotAnswered = (questionIndex) => {
    setQuestionStatuses(prev => ({
      ...prev,
      [questionIndex]: 'na'
    }));
  };

  const markForReview = (questionIndex) => {
    setQuestionStatuses(prev => ({
      ...prev,
      [questionIndex]: 'mr'
    }));
  };

  const markAnsweredAndReview = (questionIndex) => {
    setQuestionStatuses(prev => ({
      ...prev,
      [questionIndex]: 'amr'
    }));
  };

  const handleClearResponse = () => {
    const currentQuestion = questions[currentSlide + 1];
    if (currentQuestion) {
      // Clear the selected radio button
      const radioButtons = document.querySelectorAll(`input[name="question${currentSlide + 1}"]`);
      radioButtons.forEach(radio => {
        radio.checked = false;
      });
      markNotAnswered(currentSlide);
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
    setCurrentSlide(prev => prev + 1);
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
          {examData.name} - {examData.id}
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
            <div>Question Paper {examData.name} - {examData.id}</div>
          </div>
        </Header1>

        <ExamName>
          <ExamNameText>{examData?.name || 'Joint Entrance Exam'}</ExamNameText>
        </ExamName>

        <TimeSection>
          {examData?.subject || 'Section'}
          <Timer $timeLeft={timeLeft}>Time Left: {formatTime(timeLeft)}</Timer>
        </TimeSection>

        <SectionNames>
          {topics.map((topic, index) => (
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
            <button 
              onClick={handleSaveQuestion}
              style={{
                float: 'right',
                backgroundColor: questions[currentSlide + 1]?.f ? '#279' : '#fff',
                color: questions[currentSlide + 1]?.f ? '#FFF' : '#000',
                fontFamily: 'sans-serif',
                fontSize: '15px',
                borderRadius: '3px',
                padding: '7px',
                cursor: 'pointer',
                marginBottom: '5px',
                marginRight: '10px',
                border: '1px solid #279'
              }}
            >
              {questions[currentSlide + 1]?.f ? 'Saved' : 'Save'}
            </button>
          </QuestionTitle>

          {/* Question content */}
          {questions[currentSlide + 1] && (
            <div style={{ opacity: 1, zIndex: 2, position: 'relative' }}>
              <div style={{ 
                backgroundColor: '#ffffff',
                fontSize: '19px',
                marginBottom: '10px',
                padding: '20px'
              }}>
                <QuestionText />
              </div>
              <div style={{
                backgroundColor: '#ffffff',
                fontSize: '19px',
                marginBottom: '20px',
                textAlign: 'left',
                display: 'inline-block',
                padding: '10px'
              }}>
                {['o1', 'o2', 'o3', 'o4'].map((option, index) => (
                  <label key={index} style={{ display: 'block', marginBottom: '10px' }}>
                    <input 
                      type="radio" 
                      name={`question${currentSlide + 1}`} 
                      value={['A', 'B', 'C', 'D'][index]}
                      onChange={handleAnswerSelect}
                    />
                    {questions[currentSlide + 1][option]}
                  </label>
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
            setCurrentSlide(prev => prev + 1);
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
            {topics.find(topic => topic.id === currentTopic)?.name || 'Section'}
          </PaletteHeader>
          <QuestionPalette>
            <ChooseText>Choose a Question</ChooseText>
            <PaletteGrid>
              {Object.keys(questions).map((_, index) => {
                const status = questionStatuses[index] || 'nv';
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
          <Button style={{ width: '50%' }}>Submit</Button>
        </div>
      </Sidebar>
    </ExamContainer>
  );
}

export default ExamInterfacePage;
