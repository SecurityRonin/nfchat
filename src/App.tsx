import { useStore } from '@/lib/store';
import { useDuckDB } from '@/hooks/useDuckDB';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, AlertCircle } from 'lucide-react';

function App() {
  const { dataLoaded, dataLoading, dataError, totalRows, loadData } = useDuckDB();
  const messages = useStore((state) => state.messages);

  const handleLoadData = () => {
    // Load Parquet file from public/data (much faster than CSV)
    loadData('/data/NF-UNSW-NB15-v3.parquet');
  };

  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              NFChat - Netflow Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dataError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {dataError}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Load the NF-UNSW-NB15 netflow dataset to begin analysis.
              The dataset contains ~2.3M flow records with 10 attack types.
            </p>

            <Button
              onClick={handleLoadData}
              disabled={dataLoading}
              className="w-full"
            >
              {dataLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading dataset...
                </>
              ) : (
                'Load Dataset'
              )}
            </Button>

            {dataLoading && (
              <p className="text-xs text-muted-foreground text-center">
                This may take 30-60 seconds for the full CSV...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">NFChat</h1>
          <Badge variant="secondary">
            {totalRows.toLocaleString()} flows
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Export
          </Button>
        </div>
      </header>

      {/* Main content placeholder */}
      <main className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Timeline */}
          <Card className="lg:col-span-4">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="h-32 flex items-center justify-center text-muted-foreground">
              Timeline chart placeholder
            </CardContent>
          </Card>

          {/* Stats row */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Top Talkers</CardTitle>
            </CardHeader>
            <CardContent className="h-48 flex items-center justify-center text-muted-foreground">
              Chart placeholder
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Protocols</CardTitle>
            </CardHeader>
            <CardContent className="h-48 flex items-center justify-center text-muted-foreground">
              Chart placeholder
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Attack Types</CardTitle>
            </CardHeader>
            <CardContent className="h-48 flex items-center justify-center text-muted-foreground">
              Chart placeholder
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Network Graph</CardTitle>
            </CardHeader>
            <CardContent className="h-48 flex items-center justify-center text-muted-foreground">
              Graph placeholder
            </CardContent>
          </Card>

          {/* Flow table */}
          <Card className="lg:col-span-4">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Flow Table</CardTitle>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
              Data table placeholder
            </CardContent>
          </Card>
        </div>

        {/* Chat panel placeholder */}
        <Card className="fixed bottom-4 right-4 w-96 shadow-lg">
          <CardHeader className="py-2 border-b">
            <CardTitle className="text-sm">Chat</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="h-32 mb-3 text-sm text-muted-foreground">
              {messages.length === 0
                ? 'Ask questions about the netflow data...'
                : `${messages.length} messages`}
            </div>
            <input
              type="text"
              placeholder="Ask about these flows..."
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default App;
