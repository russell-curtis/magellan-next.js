import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MagellanLogomark } from "@/components/ui/magellan-logomark";
import { 
  FileText, 
  Users, 
  Clock, 
  Shield, 
  BarChart3, 
  MessageSquare,
  CheckCircle,
  Upload,
  Eye,
  Workflow,
  Bell
} from "lucide-react";

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 lg:py-32 bg-black relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-black"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
      
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="text-center mb-20">
          <Badge variant="outline" className="mb-6 bg-black border-slate-700 text-slate-300 hover:bg-slate-700/50 transition-colors backdrop-blur-sm">
            Platform Features
          </Badge>
          <h2 className="text-4xl lg:text-6xl font-bold text-white mb-8 tracking-tight">
            Everything You Need to Manage{" "}
            <span className="bg-clip-text text-transparent" style={{backgroundImage: 'linear-gradient(to right, #5B73E8, #3f59d9)'}}>
              CRBI Applications
            </span>
          </h2>
          <p className="text-lg text-slate-300 max-w-4xl mx-auto leading-relaxed">
            From client onboarding to citizenship approval, our comprehensive platform 
            handles every aspect of the CRBI process with precision and efficiency.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-16">
          <FeatureCard
            icon={<Users className="h-6 w-6" />}
            title="Client Management"
            description="Centralized client profiles with complete application history, document tracking, and communication logs."
            features={["Secure client portals", "Real-time status updates", "Document sharing"]}
            color="blue"
          />

          <FeatureCard
            icon={<Workflow className="h-6 w-6" />}
            title="Application Tracking"
            description="End-to-end workflow management with automated stage progression and milestone tracking."
            features={["Visual progress tracking", "Automated reminders", "Deadline management"]}
            color="green"
          />

          <FeatureCard
            icon={<FileText className="h-6 w-6" />}
            title="Document Management"
            description="Intelligent document collection, validation, and organization with built-in compliance checks."
            features={["Document validation", "Version control", "Bulk operations"]}
            color="purple"
          />

          <FeatureCard
            icon={<Shield className="h-6 w-6" />}
            title="Compliance Assurance"
            description="Built-in government requirements and regulations for all supported CRBI programs."
            features={["Requirement checklists", "Compliance alerts", "Audit trails"]}
            color="red"
          />

          <FeatureCard
            icon={<MessageSquare className="h-6 w-6" />}
            title="Secure Communication"
            description="Encrypted messaging system for confidential client communications and file sharing."
            features={["End-to-end encryption", "Message history", "File attachments"]}
            color="indigo"
          />

          <FeatureCard
            icon={<BarChart3 className="h-6 w-6" />}
            title="Analytics & Reporting"
            description="Comprehensive insights into your firm's performance, success rates, and efficiency metrics."
            features={["Performance dashboards", "Custom reports", "Export capabilities"]}
            color="orange"
          />
        </div>

        {/* Process Flow */}
        <div className="p-12">
          <div className="text-center mb-16">
            <h3 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Streamlined{" "}
              <span className="bg-clip-text text-transparent" style={{backgroundImage: 'linear-gradient(to right, #5B73E8, #3f59d9)'}}>
                CRBI Process
              </span>
            </h3>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Our platform guides you through every step of the citizenship application process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <ProcessStep
              step="1"
              title="Client Onboarding"
              description="Secure registration and initial assessment"
              icon={<Users className="h-5 w-5" />}
            />
            <ProcessStep
              step="2"
              title="Document Collection"
              description="Automated document requests and validation"
              icon={<Upload className="h-5 w-5" />}
            />
            <ProcessStep
              step="3"
              title="Application Review"
              description="Internal review and compliance checks"
              icon={<Eye className="h-5 w-5" />}
            />
            <ProcessStep
              step="4"
              title="Government Submission"
              description="Official submission to relevant authorities"
              icon={<MagellanLogomark size={20} />}
            />
            <ProcessStep
              step="5"
              title="Approval & Completion"
              description="Final processing and citizenship delivery"
              icon={<CheckCircle className="h-5 w-5" />}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  color: string;
}

const FeatureCard = ({ icon, title, description, features, color }: FeatureCardProps) => {
  const colorClasses = {
    blue: {
      bg: "from-blue-500/10 to-blue-600/5",
      border: "border-blue-500/20",
      glow: "shadow-blue-500/10",
      icon: "text-blue-400"
    },
    green: {
      bg: "from-green-500/10 to-emerald-600/5", 
      border: "border-green-500/20",
      glow: "shadow-green-500/10",
      icon: "text-green-400"
    },
    purple: {
      bg: "from-purple-500/10 to-purple-600/5",
      border: "border-purple-500/20", 
      glow: "shadow-purple-500/10",
      icon: "text-purple-400"
    },
    red: {
      bg: "from-red-500/10 to-red-600/5",
      border: "border-red-500/20",
      glow: "shadow-red-500/10", 
      icon: "text-red-400"
    },
    indigo: {
      bg: "from-indigo-500/10 to-indigo-600/5",
      border: "border-indigo-500/20",
      glow: "shadow-indigo-500/10",
      icon: "text-indigo-400"
    },
    orange: {
      bg: "from-orange-500/10 to-orange-600/5",
      border: "border-orange-500/20",
      glow: "shadow-orange-500/10",
      icon: "text-orange-400"
    },
  };

  const currentColor = colorClasses[color as keyof typeof colorClasses];

  return (
    <Card className="group relative p-8 h-full backdrop-blur-xl border-gray-700/50 hover:border-gray-600/30 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden" style={{backgroundColor: '#111'}}>
      {/* Animated background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${currentColor.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
      
      {/* Subtle glow effect */}
      <div className={`absolute inset-0 ${currentColor.glow} shadow-2xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 blur-xl`}></div>
      
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-600 to-transparent group-hover:via-gray-400 transition-colors duration-500`}></div>
      
      <div className="relative z-10 space-y-6">
        {/* Enhanced icon container */}
        <div className="relative">
          <div className={`inline-flex p-5 rounded-3xl border-2 ${currentColor.border} bg-gradient-to-br ${currentColor.bg} group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ${currentColor.glow} group-hover:shadow-lg`}>
            <div className={`${currentColor.icon} transition-colors duration-300`}>
              {icon}
            </div>
          </div>
          
          {/* Floating accent dot */}
          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${currentColor.bg} ${currentColor.border} border opacity-0 group-hover:opacity-100 transition-all duration-500 animate-pulse`}></div>
        </div>
        
        {/* Enhanced content */}
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-gray-100 transition-colors duration-300">
            {title}
          </h3>
          <p className="text-slate-300 group-hover:text-slate-200 leading-relaxed transition-colors duration-300">
            {description}
          </p>
        </div>

        {/* Enhanced feature list */}
        <div className="space-y-4 pt-2">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-3 text-sm group/item">
              <div className="relative">
                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 group-hover/item:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-green-400/20 rounded-full scale-0 group-hover/item:scale-150 transition-transform duration-300 blur-sm"></div>
              </div>
              <span className="text-slate-300 group-hover:text-slate-200 group-hover/item:text-white transition-colors duration-300">
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Bottom highlight */}
      <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-gradient-to-r ${currentColor.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm`}></div>
    </Card>
  );
};

interface ProcessStepProps {
  step: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const ProcessStep = ({ step, title, description, icon }: ProcessStepProps) => {
  return (
    <div className="text-center space-y-6 group">
      <div className="relative">
        <div className="w-20 h-20 bg-gradient-to-br from-gray-600 to-gray-700 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-gray-600/25 group-hover:scale-110 transition-transform duration-300">
          <span className="text-2xl font-bold">{step}</span>
        </div>
        <div className="absolute -top-3 -right-3 bg-gray-900/80 backdrop-blur-sm p-3 rounded-xl border border-gray-600/50">
          <div className="text-gray-400">{icon}</div>
        </div>
      </div>
      
      <div>
        <h4 className="font-semibold text-white mb-3 text-lg group-hover:text-gray-300 transition-colors duration-300">{title}</h4>
        <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
};