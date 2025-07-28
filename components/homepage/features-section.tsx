import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Users, 
  Clock, 
  Shield, 
  BarChart3, 
  MessageSquare,
  CheckCircle,
  Globe,
  Upload,
  Eye,
  Workflow,
  Bell
} from "lucide-react";

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Platform Features
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
            Everything You Need to Manage CRBI Applications
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
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
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Streamlined CRBI Process
            </h3>
            <p className="text-gray-600">
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
              icon={<Globe className="h-5 w-5" />}
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
    blue: "bg-blue-100 text-blue-600 border-blue-200",
    green: "bg-green-100 text-green-600 border-green-200",
    purple: "bg-purple-100 text-purple-600 border-purple-200",
    red: "bg-red-100 text-red-600 border-red-200",
    indigo: "bg-indigo-100 text-indigo-600 border-indigo-200",
    orange: "bg-orange-100 text-orange-600 border-orange-200",
  };

  return (
    <Card className="p-6 h-full hover:shadow-lg transition-shadow">
      <div className="space-y-4">
        <div className={`inline-flex p-3 rounded-xl ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
        
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-4">{description}</p>
        </div>

        <div className="space-y-2">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-gray-700">{feature}</span>
            </div>
          ))}
        </div>
      </div>
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
    <div className="text-center space-y-4">
      <div className="relative">
        <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-xl font-bold">{step}</span>
        </div>
        <div className="absolute -top-2 -right-2 bg-blue-100 p-2 rounded-lg">
          {icon}
        </div>
      </div>
      
      <div>
        <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
};