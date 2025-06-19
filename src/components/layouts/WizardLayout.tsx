import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TextInputField } from '../forms/TextInputField';
import { TimeSelector } from '../forms/TimeSelector';
import { CheckboxField } from '../forms/CheckboxField';
import { EnergyLevelSelector } from '../forms/EnergyLevelSelector';
import { TaskBreakdownLevelSelector } from '../forms/TaskBreakdownLevelSelector';
import { DocumentUpload } from '../forms/DocumentUpload';
import { Button } from '../ui/Button';
import { Brain, ArrowLeft, ArrowRight, Sparkles, Target, Zap, FileText, Rocket } from 'lucide-react';

interface WizardLayoutProps {
  taskDescription: string;
  setTaskDescription: (description: string) => void;
  timeAllocated: number;
  setTimeAllocated: (time: number) => void;
  strictTimeAdherence: boolean;
  setStrictTimeAdherence: (strict: boolean) => void;
  energyLevel: string;
  setEnergyLevel: (level: string) => void;
  breakdownLevel: string;
  setBreakdownLevel: (level: string) => void;
  documentFiles: File[];
  addDocumentFiles: (files: File[]) => void;
  removeDocumentFile: (fileName: string) => void;
  isLoading: boolean;
  error: string | null;
  handleSubmit: (e: React.FormEvent) => void;
}

const wizardSteps = [
  { id: 'goal', title: 'Your Goal', icon: Target },
  { id: 'context', title: 'Add Context', icon: FileText },
  { id: 'tuning', title: 'Fine-tune', icon: Zap },
  { id: 'launch', title: 'Launch', icon: Rocket }
];

export const WizardLayout: React.FC<WizardLayoutProps> = ({
  taskDescription,
  setTaskDescription,
  timeAllocated,
  setTimeAllocated,
  strictTimeAdherence,
  setStrictTimeAdherence,
  energyLevel,
  setEnergyLevel,
  breakdownLevel,
  setBreakdownLevel,
  documentFiles,
  addDocumentFiles,
  removeDocumentFile,
  isLoading,
  error,
  handleSubmit
}) => {
  const [step, setStep] = useState(0);

  const nextStep = () => setStep(s => Math.min(s + 1, wizardSteps.length - 1));
  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const canProceed = () => {
    switch (step) {
      case 0: return taskDescription.trim().length > 0;
      case 1: return true; // Documents are optional
      case 2: return true; // All tuning options have defaults
      case 3: return taskDescription.trim().length > 0;
      default: return false;
    }
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(e);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Dark themed wizard with gradient background */}
      <div className="relative min-h-[600px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl shadow-2xl overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-pulse"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
        
        {/* Progress indicator */}
        <div className="relative z-10 pt-8 px-8">
          <div className="flex items-center justify-between mb-8">
            {wizardSteps.map((wizardStep, index) => {
              const Icon = wizardStep.icon;
              const isActive = index === step;
              const isCompleted = index < step;
              
              return (
                <div key={wizardStep.id} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300
                    ${isActive 
                      ? 'bg-white text-purple-900 border-white shadow-lg scale-110' 
                      : isCompleted 
                        ? 'bg-green-500 text-white border-green-500' 
                        : 'bg-transparent text-white/60 border-white/30'
                    }
                  `}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {index < wizardSteps.length - 1 && (
                    <div className={`
                      w-16 h-0.5 mx-4 transition-all duration-300
                      ${index < step ? 'bg-green-500' : 'bg-white/20'}
                    `} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="relative z-10 px-8 pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center text-white"
            >
              {step === 0 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Sparkles className="w-16 h-16 text-yellow-400 mx-auto animate-pulse" />
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                      What's your main goal today?
                    </h2>
                    <p className="text-xl text-purple-200">
                      Describe what you want to accomplish, and I'll break it down into manageable steps
                    </p>
                  </div>
                  
                  <div className="max-w-2xl mx-auto">
                    <TextInputField
                      placeholder="e.g., Prepare for my marketing presentation, Study chapter 5 of calculus, Plan my weekend trip..."
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      className="min-h-[120px] bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <FileText className="w-16 h-16 text-blue-400 mx-auto" />
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                      Have any materials to add?
                    </h2>
                    <p className="text-xl text-blue-200">
                      Upload documents, PDFs, or notes to help me understand your context better
                    </p>
                  </div>
                  
                  <div className="max-w-2xl mx-auto">
                    <DocumentUpload
                      onFilesSelect={addDocumentFiles}
                      onRemoveFile={removeDocumentFile}
                      selectedFiles={documentFiles}
                      isProcessing={isLoading}
                      error={error}
                      className="bg-white/5 border-white/20"
                    />
                  </div>
                  
                  <p className="text-sm text-white/60">
                    This step is optional - you can skip if you don't have any materials
                  </p>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Zap className="w-16 h-16 text-orange-400 mx-auto" />
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-orange-200 bg-clip-text text-transparent">
                      How should we build your plan?
                    </h2>
                    <p className="text-xl text-orange-200">
                      Let's customize the plan to match your energy and time constraints
                    </p>
                  </div>
                  
                  <div className="max-w-3xl mx-auto space-y-8">
                    <EnergyLevelSelector
                      value={energyLevel}
                      onChange={setEnergyLevel}
                      className="text-left"
                    />
                    
                    <TaskBreakdownLevelSelector
                      value={breakdownLevel}
                      onChange={setBreakdownLevel}
                      className="text-left"
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="text-left">
                        <TimeSelector
                          label="Time available (optional)"
                          value={timeAllocated || ''}
                          onChange={(e) => setTimeAllocated(Number(e.target.value) || 0)}
                          min="5"
                          max="480"
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                      
                      <div className="flex items-end">
                        <CheckboxField
                          label="Strict time limits"
                          description="Plan must fit exactly within time"
                          checked={strictTimeAdherence}
                          onChange={(e) => setStrictTimeAdherence(e.target.checked)}
                          disabled={!timeAllocated}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Rocket className="w-16 h-16 text-green-400 mx-auto animate-bounce" />
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-green-200 bg-clip-text text-transparent">
                      Ready to launch your plan?
                    </h2>
                    <p className="text-xl text-green-200">
                      I'll analyze your goal and create a personalized, step-by-step plan
                    </p>
                  </div>
                  
                  <div className="max-w-2xl mx-auto bg-white/10 rounded-2xl p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-white">Plan Summary:</h3>
                    <div className="text-left space-y-2 text-sm">
                      <p><span className="text-white/60">Goal:</span> <span className="text-white">{taskDescription.substring(0, 100)}...</span></p>
                      <p><span className="text-white/60">Energy Level:</span> <span className="text-white capitalize">{energyLevel}</span></p>
                      <p><span className="text-white/60">Task Size:</span> <span className="text-white capitalize">{breakdownLevel} steps</span></p>
                      {timeAllocated > 0 && (
                        <p><span className="text-white/60">Time:</span> <span className="text-white">{timeAllocated} minutes</span></p>
                      )}
                      {documentFiles.length > 0 && (
                        <p><span className="text-white/60">Documents:</span> <span className="text-white">{documentFiles.length} file{documentFiles.length > 1 ? 's' : ''}</span></p>
                      )}
                    </div>
                  </div>
                  
                  {/* Enhanced Launch Button */}
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>
                    <Button
                      onClick={handleFinalSubmit}
                      disabled={!canProceed() || isLoading}
                      className="relative w-full max-w-md mx-auto h-16 text-xl font-bold bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-400 hover:to-blue-500 text-white shadow-2xl transform hover:scale-105 transition-all duration-300 ease-out border-0 rounded-2xl group overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-out"></div>
                      <div className="relative flex items-center justify-center space-x-3">
                        <Brain className="w-6 h-6 animate-pulse" />
                        <span className="tracking-wide">
                          {isLoading ? 'Creating Magic...' : 'Create My Plan'}
                        </span>
                        <Sparkles className="w-5 h-5 animate-spin" />
                      </div>
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex justify-between items-center mt-12">
            <Button
              onClick={prevStep}
              disabled={step === 0}
              variant="ghost"
              className="text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="text-sm text-white/60">
              Step {step + 1} of {wizardSteps.length}
            </div>

            {step < wizardSteps.length - 1 && (
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 disabled:opacity-30"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}

            {step === wizardSteps.length - 1 && (
              <div className="w-20" /> // Spacer to maintain layout
            )}
          </div>
        </div>

        {error && (
          <div className="absolute bottom-4 left-4 right-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg backdrop-blur-sm">
            <p className="text-red-200 text-sm text-center">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};