import React from 'react';
import { Brain, Target, Users, Sparkles, Heart, Zap, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useNavigate } from 'react-router-dom';

const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4 text-center bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-8">
            <Brain className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Transform Overwhelming Tasks Into 
            <span className="text-primary"> Manageable Steps</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            FocusFlow uses AI to break down complex goals into actionable plans, then guides you through focused work sessions using the proven Pomodoro Technique.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/')}
              className="flex items-center space-x-2"
            >
              <Sparkles className="w-5 h-5" />
              <span>Try FocusFlow Free</span>
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/signup')}
              className="flex items-center space-x-2"
            >
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Mission
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We believe everyone deserves to feel productive and accomplished, regardless of their learning style or attention challenges.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-heart/10 rounded-full mb-6">
                <Heart className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Supporting Neurodivergent Minds
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                FocusFlow was created with ADHD students and procrastinators in mind. We understand that traditional productivity tools often fall short when your brain works differently. Our AI breaks down overwhelming tasks into bite-sized, manageable steps that feel achievable rather than intimidating.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-palette-success-500 flex-shrink-0" />
                  <span className="text-muted-foreground">Reduces task paralysis and overwhelm</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-palette-success-500 flex-shrink-0" />
                  <span className="text-muted-foreground">Provides clear, actionable next steps</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-palette-success-500 flex-shrink-0" />
                  <span className="text-muted-foreground">Adapts to your energy levels and preferences</span>
                </li>
              </ul>
            </div>
            
            <div>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Effortless Plan Creation for Everyone
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Whether you're a student preparing for exams, a professional tackling a complex project, or anyone looking to accomplish their goals more effectively, FocusFlow makes detailed planning effortless. Simply describe what you want to achieve, and our AI creates a comprehensive, well-structured plan.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-palette-success-500 flex-shrink-0" />
                  <span className="text-muted-foreground">AI analyzes your documents and materials</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-palette-success-500 flex-shrink-0" />
                  <span className="text-muted-foreground">Creates detailed, time-estimated plans</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-palette-success-500 flex-shrink-0" />
                  <span className="text-muted-foreground">Guides you through focused work sessions</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How FocusFlow Works
            </h2>
            <p className="text-xl text-muted-foreground">
              Three simple steps to transform your productivity
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-8 hover:shadow-lg transition-shadow">
              <CardContent>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
                  <Brain className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-4">
                  1. Describe Your Goal
                </h3>
                <p className="text-muted-foreground">
                  Tell us what you want to accomplish. Upload any relevant documents, set your energy level, and specify your available time.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-8 hover:shadow-lg transition-shadow">
              <CardContent>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 rounded-full mb-6">
                  <Sparkles className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-4">
                  2. AI Creates Your Plan
                </h3>
                <p className="text-muted-foreground">
                  Our AI analyzes your goal and materials, then generates a detailed, step-by-step plan with time estimates and clear actions.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-8 hover:shadow-lg transition-shadow">
              <CardContent>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary/10 rounded-full mb-6">
                  <Zap className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-4">
                  3. Focus & Execute
                </h3>
                <p className="text-muted-foreground">
                  Follow your personalized plan using our Pomodoro timer. Track progress, stay focused, and celebrate your achievements.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
            Our Values
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Accessibility First</h3>
              <p className="text-muted-foreground">
                We design for neurodivergent minds and ensure our tools work for everyone, regardless of their learning style or attention challenges.
              </p>
            </div>
            
            <div className="p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-accent/10 rounded-full mb-4">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">AI for Good</h3>
              <p className="text-muted-foreground">
                We harness the power of AI to solve real human problems, making productivity tools more intelligent and empathetic.
              </p>
            </div>
            
            <div className="p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-full mb-4">
                <Target className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Progress Over Perfection</h3>
              <p className="text-muted-foreground">
                We believe in celebrating small wins and consistent progress rather than demanding perfection from ourselves or our users.
              </p>
            </div>
            
            <div className="p-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-palette-success-100 rounded-full mb-4">
                <Heart className="w-6 h-6 text-palette-success-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Empathy & Understanding</h3>
              <p className="text-muted-foreground">
                We understand the frustration of feeling unproductive and build tools that meet you where you are, not where you think you should be.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Ready to Transform Your Productivity?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of students and professionals who have discovered the power of AI-assisted planning and focused work sessions.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/')}
              className="flex items-center space-x-2"
            >
              <Sparkles className="w-5 h-5" />
              <span>Start Your First Plan</span>
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/signup')}
              className="flex items-center space-x-2"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-6">
            No credit card required • Free forever • Premium features available
          </p>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;