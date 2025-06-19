import React from 'react';
import { TextInputField } from '../forms/TextInputField';
import { TimeSelector } from '../forms/TimeSelector';
import { CheckboxField } from '../forms/CheckboxField';
import { EnergyLevelSelector } from '../forms/EnergyLevelSelector';
import { TaskBreakdownLevelSelector } from '../forms/TaskBreakdownLevelSelector';
import { DocumentUpload } from '../forms/DocumentUpload';
import { Button } from '../ui/Button';
import { Brain } from 'lucide-react';

interface PowerLayoutProps {
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

export const PowerLayout: React.FC<PowerLayoutProps> = ({
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
  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        <TextInputField
          label="What would you like to work on?"
          placeholder="Describe your task or project in detail..."
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          required
          className="min-h-[120px]"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <TimeSelector
              label="How much time do you have? (Optional)"
              value={timeAllocated || ''}
              onChange={(e) => setTimeAllocated(Number(e.target.value) || 0)}
              min="5"
              max="480"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty for unlimited time planning
            </p>
          </div>

          <div className="flex items-end">
            <CheckboxField
              label="Strict Time Adherence"
              description="Plan must fit exactly within the allocated time"
              checked={strictTimeAdherence}
              onChange={(e) => setStrictTimeAdherence(e.target.checked)}
              disabled={!timeAllocated}
            />
          </div>
        </div>

        <EnergyLevelSelector
          value={energyLevel}
          onChange={setEnergyLevel}
        />

        <TaskBreakdownLevelSelector
          value={breakdownLevel}
          onChange={setBreakdownLevel}
        />

        <DocumentUpload
          onFilesSelect={addDocumentFiles}
          onRemoveFile={removeDocumentFile}
          selectedFiles={documentFiles}
          isProcessing={isLoading}
          error={error}
        />

        {error && (
          <div className="p-4 bg-card border border-destructive rounded-lg">
            <p className="text-destructive text-sm">
              {error}
            </p>
          </div>
        )}

        {/* Enhanced Create My Plan Button */}
        <div className="relative">
          {/* Gradient background glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
          
          <Button
            type="submit"
            className="relative w-full h-16 text-xl font-bold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-2xl transform hover:scale-[1.02] transition-all duration-300 ease-out border-0 rounded-xl group overflow-hidden"
            disabled={!taskDescription.trim() || isLoading}
          >
            {/* Animated background shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-out"></div>
            
            {/* Button content */}
            <div className="relative flex items-center justify-center space-x-3">
              <Brain className="w-6 h-6 animate-pulse" />
              <span className="tracking-wide">
                {isLoading ? 'Creating Plan...' : 'Create My Plan'}
              </span>
              <div className="w-2 h-2 bg-accent rounded-full animate-ping"></div>
            </div>
            
            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-primary to-accent opacity-60"></div>
          </Button>
        </div>

        {/* Motivational text below button */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            ⚡ Power Mode: All controls at your fingertips
            {documentFiles.length > 0 && (
              <span className="block mt-1 text-primary">
                {documentFiles.length} document{documentFiles.length > 1 ? 's' : ''} ready for analysis
              </span>
            )}
          </p>
        </div>
      </form>
    </div>
  );
};