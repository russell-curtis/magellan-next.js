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
    <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Why Choose Magellan
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
            Transform Your CRBI Practice
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
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
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-16">
          <div className="p-6 bg-gray-50 border-b text-center">
            <h3 className="text-2xl font-bold text-gray-900">Before vs After Magellan</h3>
            <p className="text-gray-600 mt-2">See the transformation in your daily operations</p>
          </div>

          <div className="grid md:grid-cols-2">
            {/* Before */}
            <div className="p-8 border-r border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-red-100 p-2 rounded-lg">
                  <Target className="h-6 w-6 text-red-600" />
                </div>
                <h4 className="text-xl font-bold text-gray-900">Before Magellan</h4>
              </div>

              <div className="space-y-4">
                <PainPoint text="Managing 5+ different tools daily" />
                <PainPoint text="Manual application tracking in Excel" />
                <PainPoint text="Lost documents and missed deadlines" />
                <PainPoint text="Frustrated clients asking for updates" />
                <PainPoint text="40% of time spent on admin tasks" />
                <PainPoint text="Compliance errors and rejections" />
              </div>
            </div>

            {/* After */}
            <div className="p-8 bg-gradient-to-br from-green-50 to-blue-50">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="text-xl font-bold text-gray-900">After Magellan</h4>
              </div>

              <div className="space-y-4">
                <Benefit text="All tools unified in one platform" />
                <Benefit text="Automated workflow tracking" />
                <Benefit text="Intelligent document management" />
                <Benefit text="Proactive client communication" />
                <Benefit text="Focus on high-value advisory work" />
                <Benefit text="Built-in compliance assurance" />
              </div>
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

        {/* ROI Calculator Preview */}
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
          <Badge className="mb-4 bg-blue-600 text-white">ROI Calculator</Badge>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Calculate Your Potential Savings
          </h3>
          <p className="text-gray-600 mb-6">
            See how much time and money Magellan can save your firm
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">€25,000</div>
              <p className="text-sm text-gray-600">Average Annual Savings</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">280</div>
              <p className="text-sm text-gray-600">Hours Saved Per Month</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">3x</div>
              <p className="text-sm text-gray-600">Faster Application Processing</p>
            </div>
          </div>
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
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
  };

  return (
    <Card className="p-6 text-center hover:shadow-lg transition-shadow">
      <div className={`inline-flex p-4 rounded-2xl mb-4 ${colorClasses[color as keyof typeof colorClasses]}`}>
        {icon}
      </div>
      
      <div className="text-2xl font-bold text-gray-900 mb-2">{metric}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 text-sm mb-3">{description}</p>
      <p className="text-xs text-gray-500 font-medium">{metricLabel}</p>
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

interface TestimonialCardProps {
  quote: string;
  author: string;
  position: string;
  company: string;
  rating: number;
}

const TestimonialCard = ({ quote, author, position, company, rating }: TestimonialCardProps) => (
  <Card className="p-6">
    <div className="flex mb-4">
      {Array.from({ length: rating }).map((_, i) => (
        <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
      ))}
    </div>
    
    <blockquote className="text-gray-700 mb-4 italic">"{quote}"</blockquote>
    
    <div>
      <div className="font-semibold text-gray-900">{author}</div>
      <div className="text-sm text-gray-600">{position}</div>
      <div className="text-sm text-gray-500">{company}</div>
    </div>
  </Card>
);