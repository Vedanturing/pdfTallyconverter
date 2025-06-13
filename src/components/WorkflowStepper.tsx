import React from 'react';
import {
  CloudArrowUpIcon,
  DocumentMagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { WorkflowStep } from '../store/useWorkflowStore';

interface WorkflowStepperProps {
  currentStep: WorkflowStep;
}

const steps = [
  {
    id: 'upload',
    name: 'Upload',
    description: 'Upload PDF or image',
    icon: CloudArrowUpIcon,
  },
  {
    id: 'preview',
    name: 'Preview',
    description: 'Review document',
    icon: DocumentMagnifyingGlassIcon,
  },
  {
    id: 'convert',
    name: 'Convert',
    description: 'Export formats',
    icon: ArrowDownTrayIcon,
  },
  {
    id: 'validate',
    name: 'Validate',
    description: 'Check & edit data',
    icon: ClipboardDocumentCheckIcon,
  },
] as const;

const WorkflowStepper: React.FC<WorkflowStepperProps> = ({ currentStep }) => {
  const getStepStatus = (stepId: WorkflowStep) => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    const stepIndex = steps.findIndex(s => s.id === stepId);
    
    if (stepIndex < currentIndex) return 'complete';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Progress">
          <ol role="list" className="flex items-center">
            {steps.map((step, stepIdx) => {
              const status = getStepStatus(step.id);
              const isCompleted = status === 'complete';
              const isCurrent = status === 'current';

              return (
                <li
                  key={step.id}
                  className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}
                >
                  {stepIdx !== steps.length - 1 && (
                    <div
                      className={`absolute left-7 top-4 -ml-px mt-0.5 h-0.5 w-full sm:w-20 ${
                        isCompleted ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                  <div className="group relative flex items-start">
                    <span className="flex h-9 items-center">
                      <span
                        className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                          isCompleted
                            ? 'bg-indigo-600'
                            : isCurrent
                            ? 'border-2 border-indigo-600 bg-white'
                            : 'border-2 border-gray-300 bg-white'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircleIcon className="h-5 w-5 text-white" />
                        ) : (
                          <step.icon
                            className={`h-5 w-5 ${
                              isCurrent ? 'text-indigo-600' : 'text-gray-500'
                            }`}
                            aria-hidden="true"
                          />
                        )}
                      </span>
                    </span>
                    <div className="ml-4 min-w-0">
                      <span
                        className={`text-sm font-medium ${
                          isCompleted || isCurrent ? 'text-indigo-600' : 'text-gray-500'
                        }`}
                      >
                        {step.name}
                      </span>
                      <p
                        className={`text-sm ${
                          isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
};

export default WorkflowStepper; 