

type HTMLString = string;


declare module 'sankey-with-source'{

    export interface SankeyMultilevel {
        draw(): void;
        resize(): void;
        destroy(): void;
    }

    export interface Node {
        id: string;
        label: string;
        value: number;
        tips: string[];
        color?: string;
    }
    export interface Link {
        sourceChain: string[];
        source: string | Node;
        target: string | Node;
        value: number;

        // be used to remove repeated data
        inpatIds: string[];

    }
    export interface SankeyData {
        columns: Node[][];
        links: Link[];
    }
    export interface SankeyConfig {
        nodeWidth?: number,
        nodePadding?: number,
        curvature?: number,

        hasShiftFunc?: boolean,
        hasCtrlFunc?: boolean
    }
    export interface SankeyOptions {
        parentEle: HTMLDivElement,
        data: SankeyData,
        sankeyConfig: SankeyConfig,
        nodeTooltipFormatter?: (targetId: string, targetValue: number, targetNode: Node, primaryNodes: Node[]) => HTMLString
    }

    // declare module 'sankey-multilevel' {
    //     export = sankey;
    // }

    // declare var sankey: ExportFunc;

    export function initSankey(options: SankeyOptions): SankeyMultilevel;

    export function showDemoSankey(div: HTMLDivElement): void;
}

