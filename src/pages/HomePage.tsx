import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, LayoutGrid, Wand2 } from 'lucide-react';
import { usePlanStore } from '../store/planStore';
import { useUiStore } from '../store/uiStore';
import { PowerLayout } from '../components/layouts/PowerLayout';
import { WizardLayout } from '../components/layouts/WizardLayout';
import { Button } from '../components/ui/Button';
import { FOCUS_TIPS } from '../constants';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  
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
    toggleViewMode, 
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

  return (
    <div className="container mx-auto py-8">
      {/* Header Section */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Brain className="h-12 w-12 text-primary mr-3" />
          <h1 className="text-3xl font-bold text-foreground">
            FocusFlow
          </h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Transform overwhelming tasks into manageable steps with AI-powered planning
        </p>
      </div>

      {/* View Mode Toggle Button */}
      <div className="flex justify-end mb-6">
        <Button 
          onClick={toggleViewMode} 
          variant="ghost" 
          size="sm"
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {viewMode === 'wizard' ? (
            <>
              <LayoutGrid className="w-4 h-4" />
              <span>Power Mode</span>
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              <span>Guided Mode</span>
            </>
          )}
        </Button>
      </div>

      {/* Conditional Rendering of Layouts */}
      {viewMode === 'wizard' ? (
        <WizardLayout
          taskDescription={taskDescription}
          setTaskDescription={setTaskDescription}
          timeAllocated={timeAllocated}
          setTimeAllocated={setTimeAllocated}
          strictTimeAdherence={strictTimeAdherence}
          setStrictTimeAdherence={setStrictTimeAdherence}
          energyLevel={energyLevel}
          setEnergyLevel={setEnergyLevel}
          breakdownLevel={breakdownLevel}
          setBreakdownLevel={setBreakdownLevel}
          documentFiles={documentFiles}
          addDocumentFiles={addDocumentFiles}
          removeDocumentFile={removeDocumentFile}
          isLoading={isLoading}
          error={error}
          handleSubmit={handleSubmit}
        />
      ) : (
        <PowerLayout
          taskDescription={taskDescription}
          setTaskDescription={setTaskDescription}
          timeAllocated={timeAllocated}
          setTimeAllocated={setTimeAllocated}
          strictTimeAdherence={strictTimeAdherence}
          setStrictTimeAdherence={setStrictTimeAdherence}
          energyLevel={energyLevel}
          setEnergyLevel={setEnergyLevel}
          breakdownLevel={breakdownLevel}
          setBreakdownLevel={setBreakdownLevel}
          documentFiles={documentFiles}
          addDocumentFiles={addDocumentFiles}
          removeDocumentFile={removeDocumentFile}
          isLoading={isLoading}
          error={error}
          handleSubmit={handleSubmit}
        />
      )}
    </div>
  );
};

export default HomePage;