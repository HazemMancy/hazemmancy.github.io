import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Cylinder, CircleDot, Disc3, Settings2, Shield, Minus, GitBranch, TrendingUp, Ruler } from "lucide-react";
import { PIPING_CATEGORIES, CATEGORY_LABELS, type PipingCategory, type DatasetMeta } from "@/lib/engineering/piping/schemas";
import { useState, useEffect } from "react";
import { listDatasets } from "@/lib/engineering/piping/datasetManager";

const CATEGORY_INFO: Record<PipingCategory, { icon: typeof Cylinder; desc: string; standards: string[]; tags: string[]; color: string }> = {
  pipe: { icon: Cylinder, desc: "Pipe dimensions lookup: OD, ID, wall thickness, weight per length by NPS and schedule.", standards: ["ASME B36.10M", "ASME B36.19M"], tags: ["NPS/DN", "Schedule", "Wall Thickness"], color: "text-blue-400" },
  flanges: { icon: Disc3, desc: "Flange dimensions: WN, SO, BL types. OD, bolt circle, bolt holes, thickness, hub dimensions.", standards: ["ASME B16.5", "ASME B16.47"], tags: ["WN/SO/BL", "Pressure Class", "Bolt Pattern"], color: "text-blue-400" },
  fittings: { icon: GitBranch, desc: "Fitting dimensions: elbows, tees, reducers. Center-to-end, wall thickness by type and schedule.", standards: ["ASME B16.9", "ASME B16.11"], tags: ["Elbow/Tee/Reducer", "BW/SW/THD", "Dimensions"], color: "text-blue-400" },
  gaskets: { icon: CircleDot, desc: "Gasket dimensions: spiral wound, ring type, full-face. ID, OD, thickness by NPS and class.", standards: ["ASME B16.20", "ASME B16.21"], tags: ["SWG/RTJ/FF", "ID/OD", "Thickness"], color: "text-green-400" },
  valves: { icon: Settings2, desc: "Valve envelope dimensions: gate, globe, ball, check. Face-to-face, height, weight by NPS and class.", standards: ["ASME B16.10", "API 600"], tags: ["Gate/Globe/Ball", "Face-to-Face", "Envelope"], color: "text-green-400" },
  "line-blanks": { icon: Shield, desc: "Line blank dimensions: spectacle blind, spade, spacer. OD, thickness, handle dimensions.", standards: ["ASME B16.48"], tags: ["Spectacle/Spade", "Thickness", "Handle"], color: "text-green-400" },
  olets: { icon: Minus, desc: "Branch connection dimensions: weldolet, sockolet, threadolet. Run/branch size, height, bore.", standards: ["MSS SP-97"], tags: ["Weldolet/Sockolet", "Run/Branch", "Height"], color: "text-amber-400" },
  "pipe-flexibility": { icon: TrendingUp, desc: "Thermal expansion screening: guided cantilever stress check, expansion loop sizing. Screening tool.", standards: ["ASME B31.3"], tags: ["Thermal Growth", "Loop Sizing", "Screening"], color: "text-amber-400" },
  "safe-spans": { icon: Ruler, desc: "Pipe support spacing screening: stress and deflection based span limits with distributed loads.", standards: ["ASME B31.3"], tags: ["Span Limit", "Deflection", "Support"], color: "text-amber-400" },
};

export default function PipingComponentsIndex() {
  const [datasets, setDatasets] = useState<Record<string, DatasetMeta>>({});
  useEffect(() => {
    listDatasets().then(list => {
      const map: Record<string, DatasetMeta> = {};
      list.forEach(m => { map[m.category] = m; });
      setDatasets(map);
    });
  }, []);

  const calcCategories = ["pipe-flexibility", "safe-spans"];
  const lookupCategories = PIPING_CATEGORIES.filter(c => !calcCategories.includes(c));

  return (
    <div className="min-h-screen">
      <section className="py-10 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <div className="flex items-center justify-center gap-2 md:gap-3 mb-4">
              <Cylinder className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              <h1 className="text-2xl md:text-4xl font-bold" data-testid="text-piping-title">
                Piping Components
              </h1>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto text-xs md:text-base leading-relaxed px-2">
              Built-in piping component data bank with ASME standard dimensions,
              plus engineering screening calculators for flexibility and support spacing.
            </p>
          </div>

          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Dimension Lookup</h2>
          <div className="grid gap-3 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-10">
            {lookupCategories.map(cat => {
              const info = CATEGORY_INFO[cat];
              const meta = datasets[cat];
              return (
                <Link key={cat} href={`/calculators/piping-components/${cat}`}>
                  <Card className="h-full hover-elevate cursor-pointer transition-all group" data-testid={`card-piping-${cat}`}>
                    <CardContent className="p-4 md:p-6 flex flex-col h-full">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="p-2.5 rounded-md bg-primary/10 shrink-0">
                          <info.icon className="w-5 h-5 text-primary" />
                        </div>
                        <Badge variant={meta ? "default" : "secondary"} className={`text-[10px] shrink-0 ${meta ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}`}>
                          {meta ? `Custom: ${meta.row_count} rows` : "Built-in"}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-sm mb-2">{CATEGORY_LABELS[cat]}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">{info.desc}</p>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {info.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] font-normal">{tag}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between border-t border-muted/30 pt-3 mt-auto">
                        <div className="flex flex-wrap gap-1">
                          {info.standards.map(s => (
                            <span key={s} className="text-[10px] text-muted-foreground/70">{s}</span>
                          ))}
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Screening Calculators</h2>
          <div className="grid gap-3 md:gap-6 grid-cols-1 sm:grid-cols-2 mb-10">
            {calcCategories.map(cat => {
              const info = CATEGORY_INFO[cat as PipingCategory];
              return (
                <Link key={cat} href={`/calculators/piping-components/${cat}`}>
                  <Card className="h-full hover-elevate cursor-pointer transition-all group" data-testid={`card-piping-${cat}`}>
                    <CardContent className="p-4 md:p-6 flex flex-col h-full">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="p-2.5 rounded-md bg-primary/10 shrink-0">
                          <info.icon className="w-5 h-5 text-primary" />
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0 text-amber-400 border-amber-500/30">Calculator</Badge>
                      </div>
                      <h3 className="font-semibold text-sm mb-2">{CATEGORY_LABELS[cat as PipingCategory]}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">{info.desc}</p>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {info.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] font-normal">{tag}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between border-t border-muted/30 pt-3 mt-auto">
                        <span className="text-[10px] text-muted-foreground/70">{info.standards[0]}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <div className="text-center">
            <Card className="max-w-2xl mx-auto">
              <CardContent className="py-6 px-6">
                <p className="text-[10px] text-muted-foreground leading-relaxed mb-3">
                  Built-in dimensions are based on standard reference values per ASME, API, and MSS standards.
                  For project-critical applications, verify against your organization's licensed copies of the referenced standards.
                  Custom datasets can be imported to override built-in data.
                </p>
                <Link href="/calculators">
                  <Button variant="outline" size="sm" data-testid="button-back-calculators">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                    Back to Calculators
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
