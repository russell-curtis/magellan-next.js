import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import { Globe, Shield, Clock, Users } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="py-20 lg:py-32">
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge variant="outline" className="inline-flex items-center gap-2">
                <Globe className="h-4 w-4" />
                CRBI Advisory Platform
              </Badge>
              
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Streamline Your{" "}
                <span className="text-blue-600">CRBI Advisory</span>{" "}
                Practice
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                The complete platform for managing Citizenship & Residency by Investment applications. 
                Reduce administrative overhead by 30% while delivering exceptional client experiences.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">30% Time Savings</p>
                  <p className="text-sm text-gray-600">Automated workflows</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">100% Compliant</p>
                  <p className="text-sm text-gray-600">Built-in requirements</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Client Portal</p>
                  <p className="text-sm text-gray-600">Real-time transparency</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Globe className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">4 Programs</p>
                  <p className="text-sm text-gray-600">St. Kitts, Antigua & more</p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link href="/dashboard">
                  Start Free Trial
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                <Link href="#features">
                  Book a Demo
                </Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-4">Trusted by advisory firms across Europe & Middle East</p>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">500+</p>
                  <p className="text-sm text-gray-600">Applications Processed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">95%</p>
                  <p className="text-sm text-gray-600">Success Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">30%</p>
                  <p className="text-sm text-gray-600">Time Reduction</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Hero Image */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 p-8">
              <div className="relative bg-white rounded-xl shadow-2xl border">
                <div className="p-6">
                  {/* Mock dashboard interface */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Client Applications</h3>
                      <Badge className="bg-green-100 text-green-800">12 Active</Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div>
                            <p className="font-medium text-sm">John Smith - St. Kitts CBI</p>
                            <p className="text-xs text-gray-600">Application #SK-2024-001</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">75% Complete</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div>
                            <p className="font-medium text-sm">Maria Garcia - Antigua CBI</p>
                            <p className="text-xs text-gray-600">Application #AN-2024-002</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">45% Complete</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <div>
                            <p className="font-medium text-sm">David Chen - Dominica CBI</p>
                            <p className="text-xs text-gray-600">Application #DM-2024-003</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">25% Complete</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating elements for visual appeal */}
              <div className="absolute -top-4 -right-4 bg-blue-600 text-white p-3 rounded-xl shadow-lg">
                <Shield className="h-6 w-6" />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-green-600 text-white p-3 rounded-xl shadow-lg">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
