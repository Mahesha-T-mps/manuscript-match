import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Globe, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { adminService } from "@/services/adminService";

// User types as defined in your backend
const USER_TYPES = ["Springer", "Wiley", "F1000", "DMP", "AJE RQE", "T&F"];

interface SanctionedCountry {
  id?: number;
  user_type: string;
  country_name: string;
}

export const SanctionCountryManagement = () => {
  const [selectedUserType, setSelectedUserType] = useState<string>("");
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCountry, setNewCountry] = useState("");
  const [addingCountry, setAddingCountry] = useState(false);
  const { toast } = useToast();

  // Fetch countries for selected user type
  const fetchCountries = async (userType: string) => {
    if (!userType) return;
    
    setLoading(true);
    try {
      console.log(`[SanctionCountryManagement] Fetching countries for user type: ${userType}`);
      const data = await adminService.getSanctionedCountries(userType);
      console.log(`[SanctionCountryManagement] Raw API response:`, data);
      console.log(`[SanctionCountryManagement] Data type:`, typeof data);
      console.log(`[SanctionCountryManagement] Is array:`, Array.isArray(data));
      
      // Ensure data is always an array
      const countriesArray = Array.isArray(data) ? data : [];
      console.log(`[SanctionCountryManagement] Final countries array:`, countriesArray);
      setCountries(countriesArray);
    } catch (error) {
      console.error("Error fetching countries:", error);
      toast({
        title: "Error",
        description: "Failed to fetch sanctioned countries",
        variant: "destructive",
      });
      setCountries([]);
    } finally {
      setLoading(false);
    }
  };

  // Add new country (supports multiple countries separated by commas)
  const addCountry = async () => {
    if (!selectedUserType || !newCountry.trim()) {
      toast({
        title: "Error",
        description: "Please select a user type and enter a country name",
        variant: "destructive",
      });
      return;
    }

    setAddingCountry(true);
    try {
      // Split by comma and clean up each country name
      const countriesToAdd = newCountry
        .split(',')
        .map(country => country.trim())
        .filter(country => country.length > 0);

      if (countriesToAdd.length === 0) {
        toast({
          title: "Error",
          description: "Please enter at least one valid country name",
          variant: "destructive",
        });
        return;
      }

      if (countriesToAdd.length === 1) {
        // Use single country endpoint for one country
        const data = await adminService.addSanctionedCountry(selectedUserType, countriesToAdd[0]);
        
        if (data?.message === "Already exists") {
          toast({
            title: "Info",
            description: "Country already exists in the sanctioned list",
            variant: "default",
          });
        } else {
          toast({
            title: "Success",
            description: `Country "${data?.country || countriesToAdd[0]}" added successfully`,
          });
        }
      } else {
        // Use multiple countries endpoint for multiple countries
        const data = await adminService.addMultipleSanctionedCountries(selectedUserType, countriesToAdd);
        
        const addedCount = data?.added?.length || 0;
        const existingCount = countriesToAdd.length - addedCount;
        
        let message = "";
        if (addedCount > 0) {
          message += `${addedCount} ${addedCount === 1 ? 'country' : 'countries'} added successfully`;
        }
        if (existingCount > 0) {
          if (message) message += ", ";
          message += `${existingCount} ${existingCount === 1 ? 'country' : 'countries'} already existed`;
        }

        toast({
          title: addedCount > 0 ? "Success" : "Info",
          description: message,
          variant: "default",
        });
      }

      // Refresh the list
      await fetchCountries(selectedUserType);

      setNewCountry("");
      setAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding countries:", error);
      toast({
        title: "Error",
        description: "Failed to add countries",
        variant: "destructive",
      });
    } finally {
      setAddingCountry(false);
    }
  };

  // Delete country
  const deleteCountry = async (country: string) => {
    if (!selectedUserType) return;

    try {
      await adminService.deleteSanctionedCountry(selectedUserType, country);
      
      toast({
        title: "Success",
        description: `Country "${country}" removed successfully`,
      });
      
      // Refresh the list
      await fetchCountries(selectedUserType);
    } catch (error) {
      console.error("Error deleting country:", error);
      toast({
        title: "Error",
        description: "Failed to delete country",
        variant: "destructive",
      });
    }
  };

  // Effect to fetch countries when user type changes
  useEffect(() => {
    if (selectedUserType) {
      fetchCountries(selectedUserType);
    } else {
      setCountries([]);
    }
  }, [selectedUserType]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sanction Country Management</h2>
          <p className="text-gray-600">Manage sanctioned countries by user type</p>
        </div>
        
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedUserType}>
              <Plus className="h-4 w-4 mr-2" />
              Add Country
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Sanctioned Countries</DialogTitle>
              <DialogDescription>
                Add countries to the sanctioned list for {selectedUserType}. You can add multiple countries by separating them with commas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="country">Country Names</Label>
                <Input
                  id="country"
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  placeholder="Enter country names (e.g., Iran, Russia, North Korea)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addCountry();
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tip: Separate multiple countries with commas
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={addCountry} disabled={addingCountry}>
                {addingCountry && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                Add Countries
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* User Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Select User Type
          </CardTitle>
          <CardDescription>
            Choose a user type to view and manage its sanctioned countries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {USER_TYPES.map((userType) => (
              <Button
                key={userType}
                variant={selectedUserType === userType ? "default" : "outline"}
                onClick={() => setSelectedUserType(userType)}
                className="h-16 flex flex-col items-center justify-center"
              >
                <Globe className="h-6 w-6 mb-1" />
                <span className="text-sm font-medium">{userType}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Countries List */}
      {selectedUserType && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sanctioned Countries - {selectedUserType}</CardTitle>
                <CardDescription>
                  Countries that are sanctioned for {selectedUserType} user type
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchCountries(selectedUserType)}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (!countries || countries.length === 0) ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No sanctioned countries found for {selectedUserType}. Click "Add Country" to add the first one.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-600">
                    {countries?.length || 0} sanctioned {(countries?.length || 0) === 1 ? 'country' : 'countries'}
                  </span>
                </div>
                
                <div className="grid gap-2">
                  {countries?.map((country, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{country}</span>
                        <Badge variant="secondary" className="text-xs">
                          {selectedUserType}
                        </Badge>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCountry(country)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Select a user type (Springer, Wiley, F1000, DMP, AJE RQE, or T&F) to view its sanctioned countries</p>
            <p>• Add new countries to the sanctioned list using the "Add Country" button</p>
            <p>• Remove countries from the list by clicking the delete button next to each country</p>
            <p>• Changes are applied immediately and affect user validation processes</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};