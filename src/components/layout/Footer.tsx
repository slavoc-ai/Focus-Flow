import React, { useState } from 'react';
import { Brain, Mail, Shield, FileText } from 'lucide-react';
import { Modal } from '../ui/Modal';

export const Footer: React.FC = () => {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  return (
    <>
      <footer className="bg-card shadow-inner py-6 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Brain className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold text-card-foreground">FocusFlow</span>
            </div>
            
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
              <span 
                onClick={() => setShowPrivacyModal(true)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                Privacy Policy
              </span>
              <span 
                onClick={() => setShowTermsModal(true)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                Terms of Service
              </span>
              <span 
                onClick={() => setShowContactModal(true)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                Contact
              </span>
            </div>
            
            <div className="mt-4 md:mt-0 text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} FocusFlow. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Privacy Policy Modal */}
      <Modal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        title="Privacy Policy"
        description="How we collect, use, and protect your information"
        className="max-w-2xl max-h-[80vh] overflow-y-auto"
      >
        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-base font-semibold text-card-foreground">Your Privacy Matters</span>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-card-foreground mb-2">Information We Collect</h4>
              <p>We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support. This includes your email address, name, and any documents you choose to upload for AI analysis.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-card-foreground mb-2">How We Use Your Information</h4>
              <p>We use your information to provide, maintain, and improve our services, including generating personalized task plans and tracking your productivity progress. Your uploaded documents are processed by AI to create relevant task breakdowns.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-card-foreground mb-2">Data Security</h4>
              <p>We implement appropriate security measures to protect your personal information. Your data is encrypted in transit and at rest. We do not sell or share your personal information with third parties for marketing purposes.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-card-foreground mb-2">Your Rights</h4>
              <p>You have the right to access, update, or delete your personal information at any time. You can manage your account settings or contact us for assistance with data requests.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-card-foreground mb-2">Contact Us</h4>
              <p>If you have any questions about this Privacy Policy, please contact us using the information provided in our Contact section.</p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title="Terms of Service"
        description="Terms and conditions for using FocusFlow"
        className="max-w-2xl max-h-[80vh] overflow-y-auto"
      >
        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <span className="text-base font-semibold text-card-foreground">Terms & Conditions</span>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-card-foreground mb-2">Acceptance of Terms</h4>
              <p>By accessing and using FocusFlow, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-card-foreground mb-2">Use License</h4>
              <p>Permission is granted to temporarily use FocusFlow for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not modify or copy the materials.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-card-foreground mb-2">User Account</h4>
              <p>You are responsible for safeguarding the password and for maintaining the confidentiality of your account. You agree not to disclose your password to any third party and to take sole responsibility for activities that occur under your account.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-card-foreground mb-2">Prohibited Uses</h4>
              <p>You may not use FocusFlow for any unlawful purpose or to solicit others to perform unlawful acts. You may not transmit any worms, viruses, or any code of a destructive nature.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-card-foreground mb-2">Service Availability</h4>
              <p>We strive to maintain high availability but do not guarantee that the service will be available at all times. We reserve the right to modify or discontinue the service with or without notice.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-card-foreground mb-2">Limitation of Liability</h4>
              <p>In no event shall FocusFlow or its suppliers be liable for any damages arising out of the use or inability to use the materials on FocusFlow's website.</p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Contact Modal */}
      <Modal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="Contact Us"
        description="Get in touch with the FocusFlow team"
        className="max-w-lg"
      >
        <div className="space-y-6 text-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Mail className="w-5 h-5 text-primary" />
            <span className="text-base font-semibold text-card-foreground">We'd Love to Hear From You</span>
          </div>
          
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <h4 className="font-semibold text-card-foreground mb-2">Support & Feedback</h4>
              <p className="text-muted-foreground mb-2">
                Have questions, suggestions, or need help? We're here to assist you.
              </p>
              <p className="text-primary font-medium">support@focusflow.app</p>
            </div>
            
            <div className="bg-muted rounded-lg p-4">
              <h4 className="font-semibold text-card-foreground mb-2">Business Inquiries</h4>
              <p className="text-muted-foreground mb-2">
                Interested in partnerships or enterprise solutions?
              </p>
              <p className="text-primary font-medium">business@focusflow.app</p>
            </div>
            
            <div className="bg-muted rounded-lg p-4">
              <h4 className="font-semibold text-card-foreground mb-2">Response Time</h4>
              <p className="text-muted-foreground">
                We typically respond to all inquiries within 24-48 hours during business days.
              </p>
            </div>
            
            <div className="text-center pt-4 border-t border-border">
              <p className="text-muted-foreground text-xs">
                You can also reach us through your account settings or by using the feedback feature within the app.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};