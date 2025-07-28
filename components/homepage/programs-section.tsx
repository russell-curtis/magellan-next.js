import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, DollarSign, Users, CheckCircle } from "lucide-react";

export default function ProgramsSection() {
  return (
    <section id="programs" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Supported Programs
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
            Caribbean Citizenship & Residency Programs
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our platform supports the most prestigious CRBI programs in the Caribbean, 
            each offering unique benefits and investment opportunities.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mb-12">
          <ProgramCard
            country="🇰🇳 St. Kitts & Nevis"
            program="Citizenship by Investment"
            minInvestment={250000}
            processingTime="4-6 months"
            benefits={["Visa-free travel to 150+ countries", "No residency requirement", "Established program since 1984"]}
            highlight="Most Popular"
          />

          <ProgramCard
            country="🇦🇬 Antigua & Barbuda"
            program="Citizenship by Investment"
            minInvestment={230000}
            processingTime="3-4 months"
            benefits={["Visa-free travel to 150+ countries", "Include spouse and dependents", "Fast processing time"]}
            highlight="Fastest Processing"
          />

          <ProgramCard
            country="🇩🇲 Dominica"
            program="Citizenship by Investment"
            minInvestment={200000}
            processingTime="3-6 months"
            benefits={["Lowest investment threshold", "Strong passport ranking", "Tax advantages"]}
            highlight="Most Affordable"
          />

          <ProgramCard
            country="🇬🇩 Grenada"
            program="Citizenship by Investment"
            minInvestment={235000}
            processingTime="4-6 months"
            benefits={["E-2 treaty with USA", "Real estate investment options", "Growing economy"]}
            highlight="USA Treaty"
          />
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-2xl border shadow-lg overflow-hidden">
          <div className="p-6 bg-gray-50 border-b">
            <h3 className="text-xl font-bold text-gray-900">Program Comparison</h3>
            <p className="text-gray-600 mt-2">Compare key features across all supported programs</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-gray-900">Feature</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-900">St. Kitts & Nevis</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-900">Antigua & Barbuda</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-900">Dominica</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-900">Grenada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 font-medium text-gray-900">Min. Investment</td>
                  <td className="px-6 py-4 text-center">$250,000</td>
                  <td className="px-6 py-4 text-center">$230,000</td>
                  <td className="px-6 py-4 text-center text-green-600 font-semibold">$200,000</td>
                  <td className="px-6 py-4 text-center">$235,000</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-gray-900">Processing Time</td>
                  <td className="px-6 py-4 text-center">4-6 months</td>
                  <td className="px-6 py-4 text-center text-green-600 font-semibold">3-4 months</td>
                  <td className="px-6 py-4 text-center">3-6 months</td>
                  <td className="px-6 py-4 text-center">4-6 months</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-gray-900">Visa-Free Travel</td>
                  <td className="px-6 py-4 text-center">150+ countries</td>
                  <td className="px-6 py-4 text-center">150+ countries</td>
                  <td className="px-6 py-4 text-center">145+ countries</td>
                  <td className="px-6 py-4 text-center">140+ countries</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-gray-900">Residency Required</td>
                  <td className="px-6 py-4 text-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-center">5 days in 5 years</td>
                  <td className="px-6 py-4 text-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-gray-900">Due Diligence</td>
                  <td className="px-6 py-4 text-center">Comprehensive</td>
                  <td className="px-6 py-4 text-center">Comprehensive</td>
                  <td className="px-6 py-4 text-center">Enhanced</td>
                  <td className="px-6 py-4 text-center">Comprehensive</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Streamline Your CRBI Practice?
          </h3>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join hundreds of advisory firms who trust our platform to manage their 
            citizenship and residency applications with confidence and efficiency.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6">
              Start Free Trial
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6">
              Schedule a Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

interface ProgramCardProps {
  country: string;
  program: string;
  minInvestment: number;
  processingTime: string;
  benefits: string[];
  highlight?: string;
}

const ProgramCard = ({ 
  country, 
  program, 
  minInvestment, 
  processingTime, 
  benefits, 
  highlight 
}: ProgramCardProps) => {
  return (
    <Card className="p-6 h-full hover:shadow-lg transition-shadow relative">
      {highlight && (
        <Badge className="absolute -top-2 left-4 bg-blue-600 text-white">
          {highlight}
        </Badge>
      )}
      
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">{country}</h3>
          <p className="text-sm text-gray-600">{program}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-sm">
              Min. <span className="font-semibold">
                ${minInvestment.toLocaleString()}
              </span>
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold">{processingTime}</span>
          </div>
        </div>

        <div className="space-y-2">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};