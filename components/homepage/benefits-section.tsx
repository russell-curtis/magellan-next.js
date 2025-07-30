import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Shield, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  Star,
  Zap,
  Target
} from "lucide-react";

export default function BenefitsSection() {
  return (
    <section id="benefits" className="py-20 bg-gray-50">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Why Choose Magellan
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
            Transform Your CRBI Practice
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Join the leading advisory firms who have revolutionized their operations 
            with our comprehensive CRBI management platform.
          </p>
        </div>

        {/* Main Benefits Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mb-16">
          <BenefitCard
            icon={<Clock className="h-8 w-8" />}
            title="30% Time Savings"
            description="Reduce administrative overhead with automated workflows and intelligent document management."
            color="blue"
            metric="30%"
            metricLabel="Less Admin Time"
          />

          <BenefitCard
            icon={<Shield className="h-8 w-8" />}
            title="100% Compliance"
            description="Built-in government requirements ensure every application meets regulatory standards."
            color="green"
            metric="100%"
            metricLabel="Compliance Rate"
          />

          <BenefitCard
            icon={<Users className="h-8 w-8" />}
            title="Client Satisfaction"
            description="Real-time transparency and communication tools keep your clients informed and happy."
            color="purple"
            metric="95%"
            metricLabel="Client Satisfaction"
          />

          <BenefitCard
            icon={<TrendingUp className="h-8 w-8" />}
            title="Revenue Growth"
            description="Process more applications efficiently and scale your practice with confidence."
            color="orange"
            metric="40%"
            metricLabel="Revenue Increase"
          />
        </div>

        {/* Before & After Comparison */}
        <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden mb-16 border border-gray-100">
          {/* Header with enhanced styling */}
          <div className="relative p-8 bg-black border-b border-gray-800">
            <div className="text-center relative z-10">
              <Badge variant="outline" className="mb-4 border-gray-600 text-gray-300 bg-black">
                Transformation
              </Badge>
              <h3 className="text-3xl font-bold text-white mb-2">Before vs After Magellan</h3>
              <p className="text-lg text-gray-300">See the transformation in your daily operations</p>
            </div>
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-blue-500 to-purple-500"></div>
          </div>

          <div className="grid md:grid-cols-2 min-h-[500px]">
            {/* Before */}
            <div className="relative p-8 bg-gradient-to-br from-red-25 via-white to-red-25">
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-gradient-to-br from-red-500 to-red-600 p-3 rounded-2xl shadow-lg">
                    <Target className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900">Before Magellan</h4>
                    <p className="text-sm text-red-600 font-medium">Current Challenges</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <EnhancedPainPoint text="Managing 5+ different tools daily" />
                  <EnhancedPainPoint text="Manual application tracking in Excel" />
                  <EnhancedPainPoint text="Lost documents and missed deadlines" />
                  <EnhancedPainPoint text="Frustrated clients asking for updates" />
                  <EnhancedPainPoint text="40% of time spent on admin tasks" />
                  <EnhancedPainPoint text="Compliance errors and rejections" />
                </div>
              </div>
              
              {/* Subtle background decoration */}
              <div className="absolute top-4 right-4 w-32 h-32 bg-red-100 rounded-full opacity-20 blur-xl"></div>
              <div className="absolute bottom-4 left-4 w-24 h-24 bg-red-200 rounded-full opacity-15 blur-2xl"></div>
            </div>

            {/* Divider line */}
            <div className="absolute left-1/2 top-24 bottom-8 w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent hidden md:block"></div>

            {/* After */}
            <div className="relative p-8 bg-gradient-to-br from-green-25 via-emerald-25 to-blue-25">
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-2xl shadow-lg">
                    <Zap className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900">After Magellan</h4>
                    <p className="text-sm text-green-600 font-medium">Transformed Operations</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <EnhancedBenefit text="All tools unified in one platform" />
                  <EnhancedBenefit text="Automated workflow tracking" />
                  <EnhancedBenefit text="Intelligent document management" />
                  <EnhancedBenefit text="Proactive client communication" />
                  <EnhancedBenefit text="Focus on high-value advisory work" />
                  <EnhancedBenefit text="Built-in compliance assurance" />
                </div>
              </div>
              
              {/* Subtle background decoration */}
              <div className="absolute top-4 right-4 w-32 h-32 bg-green-100 rounded-full opacity-20 blur-xl"></div>
              <div className="absolute bottom-4 left-4 w-24 h-24 bg-emerald-200 rounded-full opacity-15 blur-2xl"></div>
            </div>
          </div>
        </div>

        {/* Success Stories */}
        <div className="grid gap-8 md:grid-cols-3 mb-16">
          <TestimonialCard
            quote="Magellan reduced our processing time by 35% and eliminated compliance errors completely."
            author="Sarah Johnson"
            position="Managing Director"
            company="Atlantic Advisory Partners"
            rating={5}
          />

          <TestimonialCard
            quote="Our clients love the transparency. We've seen a 50% reduction in status inquiry calls."
            author="Michael Chen"
            position="Senior Partner"
            company="Global Citizenship Solutions"
            rating={5}
          />

          <TestimonialCard
            quote="The platform paid for itself within 3 months through increased efficiency and fewer errors."
            author="Elena Rodriguez"
            position="Operations Director"
            company="Premier Immigration Services"
            rating={5}
          />
        </div>

      </div>
    </section>
  );
}

interface BenefitCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  metric: string;
  metricLabel: string;
}

const BenefitCard = ({ icon, title, description, color, metric, metricLabel }: BenefitCardProps) => {
  const colorClasses = {
    blue: "from-blue-50 to-blue-100 border-blue-200",
    green: "from-green-50 to-green-100 border-green-200", 
    purple: "from-purple-50 to-purple-100 border-purple-200",
    orange: "from-orange-50 to-orange-100 border-orange-200",
  };

  const iconColorClasses = {
    blue: "#3f59d9",
    green: "#059669",
    purple: "#7c3aed", 
    orange: "#ea580c",
  };

  return (
    <Card className="group relative p-6 text-center bg-white border border-gray-200 hover:border-gray-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      {/* Background gradient effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} opacity-0 group-hover:opacity-50 transition-opacity duration-300`}></div>
      
      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-white via-gray-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative z-10">
        {/* Icon container with brand styling */}
        <div className="relative inline-flex mb-6">
          <div 
            className="p-4 rounded-2xl border-2 transition-all duration-300 group-hover:scale-110"
            style={{
              backgroundColor: color === 'blue' ? 'rgba(63, 89, 217, 0.1)' : `rgba(${color === 'green' ? '5, 150, 105' : color === 'purple' ? '124, 58, 237' : '234, 88, 12'}, 0.1)`,
              borderColor: color === 'blue' ? 'rgba(63, 89, 217, 0.2)' : `rgba(${color === 'green' ? '5, 150, 105' : color === 'purple' ? '124, 58, 237' : '234, 88, 12'}, 0.2)`
            }}
          >
            <div style={{ color: iconColorClasses[color as keyof typeof iconColorClasses] }}>
              {icon}
            </div>
          </div>
          
          {/* Floating accent dot */}
          <div 
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse"
            style={{ backgroundColor: iconColorClasses[color as keyof typeof iconColorClasses] }}
          ></div>
        </div>
        
        {/* Enhanced metric display */}
        <div className="mb-4">
          <div 
            className="text-4xl font-bold mb-1 transition-colors duration-300 group-hover:scale-105 transform"
            style={{ color: iconColorClasses[color as keyof typeof iconColorClasses] }}
          >
            {metric}
          </div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {metricLabel}
          </div>
        </div>
        
        {/* Title and description */}
        <h3 className="text-lg font-semibold text-gray-900 mb-3 group-hover:text-gray-800 transition-colors duration-300">
          {title}
        </h3>
        <p className="text-gray-600 text-sm leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
          {description}
        </p>
      </div>
    </Card>
  );
};

const PainPoint = ({ text }: { text: string }) => (
  <div className="flex items-center gap-3">
    <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
    <span className="text-gray-700">{text}</span>
  </div>
);

const Benefit = ({ text }: { text: string }) => (
  <div className="flex items-center gap-3">
    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
    <span className="text-gray-700">{text}</span>
  </div>
);

const EnhancedPainPoint = ({ text }: { text: string }) => (
  <div className="flex items-start gap-4 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-red-100 hover:border-red-200 transition-all duration-300 group">
    <div className="flex-shrink-0 mt-1">
      <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-sm">
        <div className="w-2 h-2 bg-white rounded-full"></div>
      </div>
    </div>
    <span className="text-gray-700 leading-relaxed group-hover:text-gray-900 transition-colors duration-300">{text}</span>
  </div>
);

const EnhancedBenefit = ({ text }: { text: string }) => (
  <div className="flex items-start gap-4 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-green-100 hover:border-green-200 transition-all duration-300 group">
    <div className="flex-shrink-0 mt-1">
      <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-sm">
        <CheckCircle className="h-4 w-4 text-white" />
      </div>
    </div>
    <span className="text-gray-700 leading-relaxed group-hover:text-gray-900 transition-colors duration-300">{text}</span>
  </div>
);

interface TestimonialCardProps {
  quote: string;
  author: string;
  position: string;
  company: string;
  rating: number;
}

const TestimonialCard = ({ quote, author, position, company, rating }: TestimonialCardProps) => (
  <Card className="group relative p-8 bg-white border border-gray-200 hover:border-gray-300 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 overflow-hidden">
    {/* Background gradient effect */}
    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    
    {/* Subtle accent line */}
    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
    
    <div className="relative z-10">
      {/* Enhanced star rating */}
      <div className="flex items-center gap-1 mb-6">
        {Array.from({ length: rating }).map((_, i) => (
          <div key={i} className="relative">
            <Star className="h-5 w-5 text-yellow-400 fill-current drop-shadow-sm" />
          </div>
        ))}
        <span className="ml-2 text-sm font-medium text-gray-500">({rating}.0)</span>
      </div>
      
      {/* Quote with enhanced styling */}
      <div className="relative mb-6">
        <div className="absolute -top-2 -left-1 text-6xl text-gray-200 font-serif leading-none">"</div>
        <blockquote className="text-gray-700 text-lg leading-relaxed font-medium relative z-10 pl-8">
          {quote}
        </blockquote>
        <div className="absolute -bottom-4 -right-1 text-6xl text-gray-200 font-serif leading-none rotate-180">"</div>
      </div>
      
      {/* Author info with enhanced hierarchy */}
      <div className="pt-4 border-t border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="font-bold text-gray-900 text-lg mb-1 group-hover:text-gray-800 transition-colors">
              {author}
            </div>
            <div className="text-sm font-medium" style={{color: '#3f59d9'}}>
              {position}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {company}
            </div>
          </div>
          
          {/* Company avatar placeholder */}
          <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center ml-4 group-hover:scale-110 transition-transform duration-300">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {company.split(' ').map(word => word[0]).join('').slice(0, 2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Card>
);