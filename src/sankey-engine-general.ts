
import * as d3 from 'd3';

export class SankeyEngineGaneral {

    private _nodes: Node[];
    private _links: Link[];
    private _nodeWidth: number;
    private _nodePadding: number;
    private _size: [number, number];
    private _iterations: number;
    private _curvature:number = 0.5;

    constructor() { }

    nodes(_: Node[]) {
        this._nodes = _;
        return this;
    }
    getNodes() {
        return this._nodes;
    }
    links(_: Link[]) {
        this._links = _;
        return this;
    }
    getLinks() {
        return this._links;
    }
    nodeWidth(_: number) {
        this._nodeWidth = _;
        return this;
    }
    getNodeWidth() {
        return this._nodeWidth;
    }
    nodePadding(_: number) {
        this._nodePadding = _;
        return this;
    }
    getNodePadding() {
        return this._nodePadding;
    }
    size(_: [number, number]) {
        this._size = _;
        return this;
    }
    getSize() {
        return this._size;
    }
    layout(iterations) {
        this.computeNodeLinks();
        this.computeNodeValues();
        this.computeNodeBreadths();

        this.computeNodeDepths(iterations);
        this.computeLinkDepths();
        return this;
    }
    curvature(_: number) {
        this._curvature = _;
        return this;
    }
    link() {
        let cure = this._curvature;
        function link(d) {
            var x0 = d.source.x + d.source.dx,
                x1 = d.target.x,
                xi = d3.interpolateNumber(x0, x1),
                x2 = xi(cure),
                x3 = xi(1 - cure),
                y0 = d.source.y + d.sy,//d.dy / 2
                y1 = d.target.y + d.ty,
                dy = d.dy;
            // let line0 = d3.line();
            // let a = line0([[x0,y0+d.dy],[x2,y0+d.dy],[x3,y1+d.dy],[x1,y1+d.dy]]);
            // let b = line0([[x0,y0+d.dy],[x2,y0+d.dy],[x3,y1+d.dy],[x1,y1+d.dy]]);
            // return [a,b];
            // return "M" + x0 + "," + y0
            //     + "C" + x2 + "," + y0
            //     + " " + x3 + "," + y1
            //     + " " + x1 + "," + y1;
            return `M${x0},${y0} C${x2},${y0} ${x3},${y1} ${x1},${y1}
            L${x1},${y1+dy}
            C${x3},${y1+dy} ${x2},${y0+dy} ${x0},${y0+dy}
            L${x0},${y0}
            `
        }
        
        return link;
    }

    private find(nodeById, id): Node {
        var node = nodeById.get(id);
        if (!node) throw new Error("missing: " + id);
        return node;
    }

    //sign node for links
    private computeNodeLinks() {
        this._nodes.forEach((node, i) => {
            node.index = i;
            node.sourceLinks = [];
            node.targetLinks = [];
        });
        let nodeById = d3.map(this._nodes, (d) => d.id);

        this._links.forEach((link, i) => {
            link.index = i;
            let source = link.source, target = link.target;

            if (typeof source !== "object") source = link.source = this.find(nodeById, source);
            if (typeof target !== "object") target = link.target = this.find(nodeById, target);
            source.sourceLinks.push(link);
            target.targetLinks.push(link);
        });
    }
    private computeNodeValues() {
        this._nodes.forEach((node) => {
            node.value = Math.max(
                d3.sum(node.sourceLinks, (d) => d.value),
                d3.sum(node.targetLinks, (d) => d.value)
            );
        });
    }

    private computeNodeBreadths() {
        let remainingNodes = this._nodes,
            nextNodes: Node[],
            x = 0;

        while (remainingNodes.length) {
            nextNodes = [];
            remainingNodes.forEach((node) => {
                node.x = x;
                node.dx = this._nodeWidth;
                node.sourceLinks.forEach((link) => {
                    if (nextNodes.indexOf(link.target) < 0) {
                        nextNodes.push(link.target);
                    }
                });
            });
            remainingNodes = nextNodes;
            ++x;
        }

        this.moveSinksRight(x);
        this.scaleNodeBreadths((this._size[0] - this._nodeWidth) / (x - 1));
    }
    private moveSinksRight(x) {
        this._nodes.forEach((node) => {
            if (!node.sourceLinks.length) {
                node.x = x - 1;
            }
        });
    }
    private scaleNodeBreadths(kx) {
        this._nodes.forEach((node) => {
            node.x *= kx;
        });
    }

    private computeNodeDepths(iterations) {
        var columns = d3.nest()
            .key((d: any) => { return d.x; })
            .sortKeys(d3.ascending)
            .entries(this._nodes)
            .map((d) => { return d.values; });

        //
        this.initializeNodeDepth(columns);
        this.resolveCollisions(columns);
        for (var alpha = 1, n = iterations; n > 0; --n) {
            this.relaxRightToLeft(columns, alpha *= 0.99);
            this.resolveCollisions(columns);
            this.relaxLeftToRight(columns, alpha);
            this.resolveCollisions(columns);
        }
    }
    private initializeNodeDepth(columns: any[]) {
        var ky = d3.min(columns, (nodes) => {
            return (this._size[1] - (nodes.length - 1) * this._nodePadding) / d3.sum(nodes, (d: any) => d.value);
        });

        columns.forEach((nodes) => {
            nodes.forEach((node, i) => {
                node.y = i;
                node.dy = node.value * ky;
            });
        });

        this._links.forEach((link) => {
            link.dy = link.value * ky;
        });
    }
    private resolveCollisions(columns) {
        columns.forEach((nodes) => {
            var node,
                dy,
                y0 = 0,
                n = nodes.length,
                i;

            // Push any overlapping nodes down.
            nodes.sort((a, b) => a.y - b.y);
            for (i = 0; i < n; ++i) {
                node = nodes[i];
                dy = y0 - node.y;
                if (dy > 0) node.y += dy;
                y0 = node.y + node.dy + this._nodePadding;
            }

            // If the bottommost node goes outside the bounds, push it back up.
            dy = y0 - this._nodePadding - this._size[1];
            if (dy > 0) {
                y0 = node.y -= dy;

                // Push any overlapping nodes back up.
                for (i = n - 2; i >= 0; --i) {
                    node = nodes[i];
                    dy = node.y + node.dy + this._nodePadding - y0;
                    if (dy > 0) node.y -= dy;
                    y0 = node.y;
                }
            }
        });
    }
    private relaxRightToLeft(columns, alpha) {
        let self =this;
        columns.slice().reverse().forEach((nodes: Node[]) => {
            nodes.forEach((node) => {
                if (node.sourceLinks.length) {
                    var y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, (d) => d.value);
                    node.y += (y - this.center(node)) * alpha;
                }
            });
        });

        function weightedTarget(link) {
            return self.center(link.target) * link.value;
        }

    }
    private center(node) {
        return node.y + node.dy / 2;
    }
    private relaxLeftToRight(columns, alpha) {
        let self =this;
        columns.forEach((nodes: Node[], breadth) => {
            nodes.forEach((node) => {
                if (node.targetLinks.length) {
                    var y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, (d) => d.value);
                    node.y += (y - this.center(node)) * alpha;
                }
            });
        });

        function weightedSource(link) {
            return self.center(link.source) * link.value;
        }
    }
    private computeLinkDepths() {
        this._nodes.forEach((node) => {
            node.sourceLinks.sort(ascendingTargetDepth);
            node.targetLinks.sort(ascendingSourceDepth);
        });
        this._nodes.forEach((node) => {
            var sy = 0, ty = 0;
            node.sourceLinks.forEach((link) => {
                link.sy = sy;
                sy += link.dy;
            });
            node.targetLinks.forEach((link) => {
                link.ty = ty;
                ty += link.dy;
            });
        });

        function ascendingSourceDepth(a, b) {
            return a.source.y - b.source.y;
        }

        function ascendingTargetDepth(a, b) {
            return a.target.y - b.target.y;
        }
    }
}

export class Link {
    source: Node;
    target: Node;
    value: number;
    index: number;
    dy: number;
    sy: number;
    ty: number;
}

export class Node {

    id: string;
    name: string;
    color: string;
    value: number;

    index: number;
    sourceLinks: Link[];
    targetLinks: Link[];
    dx: number;
    dy: number;
    x: number;
    y: number;


}
