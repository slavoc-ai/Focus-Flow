import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, ChevronDown, Sparkles, Target, FileText, Zap, Rocket, ArrowDown } from 'lucide-react';
import { usePlanStore } from '../store/planStore';
import { useUiStore } from '../store/uiStore';
import { TextInputField } from '../components/forms/TextInputField';
import { TimeSelector } from '../components/forms/TimeSelector';
import { CheckboxField } from '../components/forms/CheckboxField';
import { EnergyLevelSelector } from '../components/forms/EnergyLevelSelector';
import { TaskBreakdownLevelSelector } from '../components/forms/TaskBreakdownLevelSelector';
import { DocumentUpload } from '../components/forms/DocumentUpload';
import { Button } from '../components/ui/Button';
import { FOCUS_TIPS } from '../constants';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [currentSection, setCurrentSection] = useState(0);
  
  const {
    taskDescription,
    timeAllocated,
    strictTimeAdherence,
    energyLevel,
    breakdownLevel,
    documentFiles,
    isLoading,
    error,
    setTaskDescription,
    setTimeAllocated,
    setStrictTimeAdherence,
    setEnergyLevel,
    setBreakdownLevel,
    addDocumentFiles,
    removeDocumentFile,
    generatePlan,
  } = usePlanStore();

  const { 
    viewMode, 
    cameFromReviewPage, 
    setCameFromReviewPage, 
    initialize 
  } = useUiStore();

  // Initialize UI store on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Intelligent redirect logic - switch to power mode when coming from review page
  useEffect(() => {
    if (cameFromReviewPage) {
      // Force power mode for quick editing
      useUiStore.getState().setViewMode('power');
      setCameFromReviewPage(false);
    }
  }, [cameFromReviewPage, setCameFromReviewPage]);

  // Restore input values when returning from plan review
  useEffect(() => {
    console.log('📋 HomePage loaded with preserved input values');
  }, []);

  // Handle scroll to track current section
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('.scroll-section-full-page');
      const scrollTop = document.querySelector('.scroll-container-full-page')?.scrollTop || 0;
      const sectionHeight = window.innerHeight - 64; // navbar height
      
      const newSection = Math.round(scrollTop / sectionHeight);
      setCurrentSection(Math.max(0, Math.min(newSection, sections.length - 1)));
    };

    const scrollContainer = document.querySelector('.scroll-container-full-page');
    scrollContainer?.addEventListener('scroll', handleScroll);
    
    return () => scrollContainer?.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Start cycling tips for loading screen
      const interval = setInterval(() => {
        setCurrentTipIndex(current => 
          current === FOCUS_TIPS.length - 1 ? 0 : current + 1
        );
      }, 6000); // Slowed down by 40% as requested

      await generatePlan();
      
      clearInterval(interval);
      navigate('/plan-review');
    } catch (error) {
      console.error('Error generating plan:', error);
    }
  };

  const scrollToSection = (sectionIndex: number) => {
    const scrollContainer = document.querySelector('.scroll-container-full-page');
    const sectionHeight = window.innerHeight - 64; // navbar height
    scrollContainer?.scrollTo({
      top: sectionIndex * sectionHeight,
      behavior: 'smooth'
    });
  };

  // Loading screen with tips
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="relative mb-8">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto" />
            <Brain className="absolute inset-0 m-auto h-8 w-8 text-primary" />
          </div>
          
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Creating your personalized plan...
          </h2>
          
          {documentFiles.length > 0 && (
            <p className="text-sm text-muted-foreground mb-4">
              Processing {documentFiles.length} document{documentFiles.length > 1 ? 's' : ''}
            </p>
          )}
          
          <div className="bg-card rounded-lg p-4 border border-primary/30">
            <p className="text-primary text-sm font-medium mb-2">
              💡 Focus Tip:
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {FOCUS_TIPS[currentTipIndex]}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show scrolling wizard interface
  return (
    <div className="scroll-container-full-page">
      {/* Section 1: Main Goal */}
      <section id="step-1-goal" className="scroll-section-full-page gradient-bg-1">
        <div className="text-center max-w-2xl fade-in-up">
          <div className="mb-8 float-animation">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6">
              <Target className="w-10 h-10 text-primary" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            What's your main goal today?
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Describe what you want to accomplish, and I'll break it down into manageable steps
          </p>
          
          <div className="w-full">
            <TextInputField
              placeholder="e.g., Prepare for my marketing presentation, Study chapter 5 of calculus, Plan my weekend trip..."
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              className="min-h-[120px] text-lg"
            />
          </div>
          
          {taskDescription.trim() && (
            <Button
              onClick={() => scrollToSection(1)}
              className="mt-6 flex items-center space-x-2"
              size="lg"
            >
              <span>Continue</span>
              <ArrowDown className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {/* Scroll indicator */}
        <div className="scroll-indicator">
          <ChevronDown className="w-6 h-6 text-muted-foreground" />
        </div>
      </section>

      {/* Section 2: Add Context (Files) */}
      <section id="step-2-files" className="scroll-section-full-page gradient-bg-2">
        <div className="text-center max-w-3xl w-full fade-in-up">
          <div className="mb-8 float-animation">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-accent/10 rounded-full mb-6">
              <FileText className="w-10 h-10 text-accent" />
            </div>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Have any materials to add?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Upload documents, PDFs, or notes to help me understand your context better
          </p>
          
          <div className="w-full">
            <DocumentUpload
              onFilesSelect={addDocumentFiles}
              onRemoveFile={removeDocumentFile}
              selectedFiles={documentFiles}
              isProcessing={isLoading}
            />
          </div>
          
          <div className="flex justify-center space-x-4 mt-8">
            <Button
              variant="ghost"
              onClick={() => scrollToSection(0)}
              className="flex items-center space-x-2"
            >
              <ArrowDown className="w-4 h-4 rotate-180" />
              <span>Back</span>
            </Button>
            <Button
              onClick={() => scrollToSection(2)}
              className="flex items-center space-x-2"
              size="lg"
            >
              <span>Continue</span>
              <ArrowDown className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            This step is optional - you can skip if you don't have any materials
          </p>
        </div>
      </section>

      {/* Section 3: Fine-Tuning */}
      <section id="step-3-tuning" className="scroll-section-full-page gradient-bg-3">
        <div className="text-center max-w-4xl w-full fade-in-up">
          <div className="mb-8 float-animation">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-secondary/10 rounded-full mb-6">
              <Zap className="w-10 h-10 text-secondary" />
            </div>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            How should we build your plan?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Let's customize the plan to match your energy and preferences
          </p>
          
          <div className="w-full space-y-12">
            <EnergyLevelSelector
              value={energyLevel}
              onChange={setEnergyLevel}
            />
            
            <TaskBreakdownLevelSelector
              value={breakdownLevel}
              onChange={setBreakdownLevel}
            />
          </div>
          
          <div className="flex justify-center space-x-4 mt-8">
            <Button
              variant="ghost"
              onClick={() => scrollToSection(1)}
              className="flex items-center space-x-2"
            >
              <ArrowDown className="w-4 h-4 rotate-180" />
              <span>Back</span>
            </Button>
            <Button
              onClick={() => scrollToSection(3)}
              className="flex items-center space-x-2"
              size="lg"
            >
              <span>Continue</span>
              <ArrowDown className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>
      
      {/* Section 4: Time Constraint & Launch */}
      <section id="step-4-launch" className="scroll-section-full-page gradient-bg-4">
        <div className="text-center max-w-2xl w-full fade-in-up">
          <div className="mb-8 float-animation">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6">
              <Rocket className="w-10 h-10 text-primary" />
            </div>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Ready to launch your plan?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Set a time limit if you'd like, then let's create your personalized plan
          </p>
          
          <div className="w-full max-w-md mx-auto space-y-6 mb-8">
            <TimeSelector
              label="Time available (optional)"
              value={timeAllocated || ''}
              onChange={(e) => setTimeAllocated(Number(e.target.value) || 0)}
              min="5"
              max="480"
            />
            
            <CheckboxField
              label="Strict time limits"
              description="Plan must fit exactly within the allocated time"
              checked={strictTimeAdherence}
              onChange={(e) => setStrictTimeAdherence(e.target.checked)}
              disabled={!timeAllocated}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* Enhanced Create My Plan Button */}
          <div className="relative mb-8">
            {/* Gradient background glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
            
            <Button
              onClick={handleSubmit}
              className="relative w-full max-w-md h-16 text-xl font-bold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-2xl transform hover:scale-[1.02] transition-all duration-300 ease-out border-0 rounded-xl group overflow-hidden"
              disabled={!taskDescription.trim() || isLoading}
            >
              {/* Animated background shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-out"></div>
              
              {/* Button content */}
              <div className="relative flex items-center justify-center space-x-3">
                <Sparkles className="w-6 h-6 animate-pulse" />
                <span className="tracking-wide">
                  {isLoading ? 'Creating Plan...' : 'Create My Plan'}
                </span>
                <div className="w-2 h-2 bg-accent rounded-full animate-ping"></div>
              </div>
              
              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-primary to-accent opacity-60"></div>
            </Button>
          </div>

          <div className="flex justify-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => scrollToSection(2)}
              className="flex items-center space-x-2"
            >
              <ArrowDown className="w-4 h-4 rotate-180" />
              <span>Back</span>
            </Button>
          </div>

          {/* Motivational text */}
          <div className="mt-6">
            <p className="text-sm text-muted-foreground">
              ✨ AI-powered plan generation
              {documentFiles.length > 0 && (
                <span className="block mt-1 text-primary">
                  {documentFiles.length} document{documentFiles.length > 1 ? 's' : ''} ready for analysis
                </span>
              )}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;