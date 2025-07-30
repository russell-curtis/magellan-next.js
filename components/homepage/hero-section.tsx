import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MagellanLogomark } from "@/components/ui/magellan-logomark";
import Image from "next/image";
import Link from "next/link";
import { Shield, Clock, Users, Globe, Building } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center py-20 lg:py-32 overflow-hidden" style={{backgroundColor: '#1a1a1a'}}>
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-radial from-blue-900/20 via-transparent to-transparent"></div>
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div className="space-y-10 animate-fade-in">
            <div className="space-y-6">
              <Badge variant="outline" className="inline-flex items-center gap-2 border-slate-700 text-slate-300 hover:bg-slate-700/50 transition-colors backdrop-blur-sm" style={{backgroundColor: '#222222'}}>
                <MagellanLogomark size={16} className="text-blue-400" />
                CRBI Advisory Platform
              </Badge>
              
              <h1 className="text-5xl lg:text-7xl font-bold text-white leading-[0.9] tracking-tight">
                Streamline Your{" "}
                <span className="bg-clip-text text-transparent" style={{backgroundImage: 'linear-gradient(to right, #5B73E8, #3f59d9)'}}>
                  CRBI Advisory
                </span>{" "}
                Practice
              </h1>
              
              <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
                The complete platform for managing Citizenship & Residency by Investment applications. 
                Reduce administrative overhead by 30% while delivering exceptional client experiences.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 bg-black/50 backdrop-blur-sm rounded-xl border border-gray-800/50 hover:bg-gray-900/50 transition-all duration-300">
                <div className="bg-gray-700/30 p-3 rounded-xl border border-gray-600/30">
                  <Clock className="h-6 w-6 text-gray-300" />
                </div>
                <div>
                  <p className="font-semibold text-white">30% Time Savings</p>
                  <p className="text-sm text-gray-400">Automated workflows</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-black/50 backdrop-blur-sm rounded-xl border border-gray-800/50 hover:bg-gray-900/50 transition-all duration-300">
                <div className="bg-green-600/20 p-3 rounded-xl border border-green-500/20">
                  <Shield className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">100% Compliant</p>
                  <p className="text-sm text-gray-400">Built-in requirements</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-black/50 backdrop-blur-sm rounded-xl border border-gray-800/50 hover:bg-gray-900/50 transition-all duration-300">
                <div className="bg-gray-700/30 p-3 rounded-xl border border-gray-600/30">
                  <Users className="h-6 w-6 text-gray-300" />
                </div>
                <div>
                  <p className="font-semibold text-white">Client Portal</p>
                  <p className="text-sm text-gray-400">Real-time transparency</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-black/50 backdrop-blur-sm rounded-xl border border-gray-800/50 hover:bg-gray-900/50 transition-all duration-300">
                <div className="p-3 rounded-xl" style={{backgroundColor: 'rgba(63, 89, 217, 0.2)', borderColor: 'rgba(63, 89, 217, 0.3)', border: '1px solid'}}>
                  <Building className="h-6 w-6" style={{color: '#3f59d9'}} />
                </div>
                <div>
                  <p className="font-semibold text-white">11+ Programs</p>
                  <p className="text-sm text-gray-400">St. Kitts, Antigua & more</p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="px-6 py-3 text-white font-medium rounded-lg transition-all duration-300 border-0 purple-button">
                <Link href="/dashboard">
                  Start Free Trial
                </Link>
              </Button>
              <Button asChild variant="outline" className="px-6 py-3 border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500 rounded-lg transition-all duration-300">
                <Link href="#features">
                  Book a Demo
                </Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="pt-8 border-t border-slate-700/50">
              <p className="text-sm text-slate-400 mb-6">Trusted by advisory firms across Europe & Middle East</p>
              <div className="grid grid-cols-3 gap-8">
                <div className="text-left">
                  <p className="text-3xl font-bold text-white mb-1">500+</p>
                  <p className="text-sm text-slate-400">Applications Processed</p>
                </div>
                <div className="text-left">
                  <p className="text-3xl font-bold text-white mb-1">95%</p>
                  <p className="text-sm text-slate-400">Success Rate</p>
                </div>
                <div className="text-left">
                  <p className="text-3xl font-bold text-white mb-1">30%</p>
                  <p className="text-sm text-slate-400">Time Reduction</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Hero Image */}
          <div className="relative lg:pl-8 animate-slide-in">
            <div className="relative">
              {/* Main Dashboard Preview */}
              <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
                {/* Dashboard Header */}
                <div className="bg-gray-50 border-b border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <span className="text-gray-600 text-sm font-mono">magellan.crbi</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">12 Active</Badge>
                  </div>
                </div>
                
                {/* Dashboard Content */}
                <div className="p-6 bg-gray-50">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-semibold text-gray-900 text-lg">Client Applications</h3>
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        Real-time updates
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          <div>
                            <p className="font-medium text-sm text-gray-900">John Smith - St. Kitts CBI</p>
                            <p className="text-xs" style={{color: '#00000080'}}>Application #SK-2024-001</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">75% Complete</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-300"></div>
                          <div>
                            <p className="font-medium text-sm text-gray-900">Maria Garcia - Antigua CBI</p>
                            <p className="text-xs" style={{color: '#00000080'}}>Application #AN-2024-002</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">45% Complete</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse delay-500"></div>
                          <div>
                            <p className="font-medium text-sm text-gray-900">David Chen - Dominica CBI</p>
                            <p className="text-xs" style={{color: '#00000080'}}>Application #DM-2024-003</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">25% Complete</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-6 -right-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-2xl shadow-2xl shadow-blue-600/20 animate-float">
                <Shield className="h-6 w-6" />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-2xl shadow-2xl shadow-green-600/20 animate-float delay-1000">
                <Clock className="h-6 w-6" />
              </div>
              
              {/* Glow effects */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600/10 to-purple-600/10 -z-10 blur-xl"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
