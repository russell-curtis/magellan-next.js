import Link from "next/link";
import Image from "next/image";
import { Shield, Users, Mail } from "lucide-react";

const navigationLinks = [
  { title: "Features", href: "#features" },
  { title: "Programs", href: "#programs" },
  { title: "Pricing", href: "#pricing" },
  { title: "About", href: "/about" },
];

const legalLinks = [
  { title: "Privacy Policy", href: "/privacy" },
  { title: "Terms of Service", href: "/terms" },
  { title: "Data Protection", href: "/data-protection" },
  { title: "Compliance", href: "/compliance" },
];

const supportLinks = [
  { title: "Help Center", href: "/help" },
  { title: "Documentation", href: "/docs" },
  { title: "Contact Support", href: "/support" },
  { title: "Book a Demo", href: "/demo" },
];

export default function FooterSection() {
  return (
    <footer className="bg-black text-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center">
              <Image
                src="/logos/logomark-white.svg"
                alt="Magellan"
                width={48}
                height={48}
                className="h-12 w-12"
              />
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              The leading platform for Citizenship & Residency by Investment advisory firms. 
              Streamline your practice with our comprehensive CRBI management solution.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Shield className="h-4 w-4" />
                <span>SOC 2 Compliant</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Users className="h-4 w-4" />
                <span>500+ Firms</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-semibold text-white mb-4">Platform</h3>
            <div className="space-y-3">
              {navigationLinks.map((link, index) => (
                <Link
                  key={index}
                  href={link.href}
                  className="text-gray-400 hover:text-white block text-sm transition-colors"
                >
                  {link.title}
                </Link>
              ))}
            </div>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-white mb-4">Support</h3>
            <div className="space-y-3">
              {supportLinks.map((link, index) => (
                <Link
                  key={index}
                  href={link.href}
                  className="text-gray-400 hover:text-white block text-sm transition-colors"
                >
                  {link.title}
                </Link>
              ))}
            </div>
          </div>

          {/* Legal & Contact */}
          <div>
            <h3 className="font-semibold text-white mb-4">Legal & Contact</h3>
            <div className="space-y-3">
              {legalLinks.map((link, index) => (
                <Link
                  key={index}
                  href={link.href}
                  className="text-gray-400 hover:text-white block text-sm transition-colors"
                >
                  {link.title}
                </Link>
              ))}
              <div className="pt-2">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Mail className="h-4 w-4" />
                  <span>hello@magellancrbi.com</span>
                </div>
                <div className="text-sm text-gray-400">
                  Available 24/7 for our clients
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-400">
              © {new Date().getFullYear()} Magellan CRBI Platform. All rights reserved.
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-sm text-gray-400">
                Trusted by advisory firms worldwide
              </div>
              <div className="flex items-center gap-4">
                <div className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                  ISO 27001
                </div>
                <div className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                  GDPR Compliant
                </div>
                <div className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                  SOC 2 Type II
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
