import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users } from "lucide-react";
import logo from "@/assets/s3 2.png";

const AppSelector = () => {
  const navigate = useNavigate();

  const handleScholarFinderClick = () => {
    navigate('/login?app=scholarfinder');
  };

  const handleMSXpertClick = () => {
    navigate('/msxpert/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-academic-light flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img src={logo} alt="Logo" className="w-16 h-16 object-contain" />
            <h1 className="text-4xl font-bold text-foreground">Application Portal</h1>
          </div>
          <p className="text-lg text-muted-foreground">Choose your application to continue</p>
        </div>

        {/* Application Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* ScholarFinder Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleScholarFinderClick}>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">ScholarFinder</CardTitle>
              <CardDescription className="text-base">
                Academic manuscript and scholar matching platform
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button size="lg" className="w-full">
                Access ScholarFinder
              </Button>
            </CardContent>
          </Card>

          {/* MSXpert Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleMSXpertClick}>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 bg-secondary/10 rounded-full w-fit">
                <Users className="w-8 h-8 text-secondary" />
              </div>
              <CardTitle className="text-2xl">MSXpert</CardTitle>
              <CardDescription className="text-base">
                Expert management and consultation platform
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button size="lg" className="w-full">
                Access MSXpert
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>Select an application above to continue to the login page</p>
        </div>
      </div>
    </div>
  );
};

export default AppSelector;