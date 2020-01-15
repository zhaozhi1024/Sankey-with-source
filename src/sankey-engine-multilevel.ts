
import * as d3 from 'd3';

export class SankeyEngineMultilevel {

    private _columns: Node[][];
    private _nodes: Node[];
    private _links: Link[];
    private _linksGroupIndexArrary: number[];
    private _nodeWidth: number;
    private _nodePadding: number;
    private _size: [number, number];
    private _iterations: number;
    private _curvature = 0.5;

    private columnMap: Map<number, string[]>;
    private columnCount: number;
    constructor() { }

    columns(_: Node[][]) {
        this._columns = _;
        this._nodes = [];
        this._columns.forEach(nodesArray => {
            nodesArray.forEach(node => {
                this._nodes.push(node);
            });
        });

        this.columnCount = this._columns.length;
        this.columnMap = new Map<number, string[]>();

        this._columns.forEach((colm: any[], i) => {
            this.columnMap.set(i, colm.map((node) => {
                return node.id;
            }));
        });
        return this;
    }
    getNodes() {
        return this._nodes;
    }
    links(_: Link[]) {
        this._links = _;
        this._linksGroupIndexArrary = this._links.map(link => link.linkGroupIndex);
        this._linksGroupIndexArrary.sort((a, b) => a - b);

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
        const cure = this._curvature;
        const _self = this;
        function link(d) {
            let x0, x1, xi, x2, x3, y0, y1, dy;

            if (d.linkGroupIndex < _self.columnCount) {
                x0 = d.source.x + d.source.dx;
                x1 = d.target.x;

            } else {
                x0 = d.source.x;
                x1 = d.target.x + d.source.dx;

            }
            xi = d3.interpolateNumber(x0, x1);
            x2 = xi(cure);
            x3 = xi(1 - cure);
            y0 = d.source.y + d.sy; // d.dy / 2
            y1 = d.target.y + d.ty;
            dy = (d.dy < 3 && d.dy !== 0) ? 3 : d.dy;
            // dy = d.dy;
            // let line0 = d3.line();
            // let a = line0([[x0,y0+d.dy],[x2,y0+d.dy],[x3,y1+d.dy],[x1,y1+d.dy]]);
            // let b = line0([[x0,y0+d.dy],[x2,y0+d.dy],[x3,y1+d.dy],[x1,y1+d.dy]]);
            // return [a,b];
            // return "M" + x0 + "," + y0
            //     + "C" + x2 + "," + y0
            //     + " " + x3 + "," + y1
            //     + " " + x1 + "," + y1;
            return `M${x0},${y0} C${x2},${y0} ${x3},${y1} ${x1},${y1}
            L${x1},${y1 + dy}
            C${x3},${y1 + dy} ${x2},${y0 + dy} ${x0},${y0 + dy}
            L${x0},${y0}
            `;
        }

        return link;
    }

    private find(nodeById, id): Node {
        const node = nodeById.get(id);
        if (!node) { throw new Error('missing: ' + id); }
        return node;
    }

    // sign node for links
    private computeNodeLinks() {
        this._nodes.forEach((node, i) => {
            node.sourceLinks = [];
            node.targetLinks = [];
        });
        const nodeById = d3.map(this._nodes, (d) => d.id);
        this._links.forEach((link, i) => {
            let source = link.source, target = link.target;

            if (typeof source !== 'object') { source = link.source = this.find(nodeById, source); }
            if (typeof target !== 'object') { target = link.target = this.find(nodeById, target); }
            source.sourceLinks.push(link);
            target.targetLinks.push(link);

        });
    }
    private computeNodeValues() {
        this._nodes.forEach((node) => {

            node.value = Math.max(

                d3.sum(node.sourceLinks.filter(link => link.linkGroupIndex === 0), (d) => d.value),
                d3.sum(node.targetLinks.filter(link => link.linkGroupIndex === 0), (d) => d.value)
            );
        });
    }

    private computeNodeBreadths() {
        const nodeById = d3.map(this._nodes, (d) => d.id);
        for (let i = 0; i < this.columnCount; i++) {
            this.columnMap.get(i).forEach(id => {
                const node = this.find(nodeById, id);
                node.dx = this._nodeWidth;
                node.x = i * (this._size[0] - this._nodeWidth) / (this.columnCount - 1);
            });

        }
    }

    private computeNodeDepths(iterations) {

        this.initializeNodeDepth(this._columns);
        // this.resolveCollisions(this._columns);
        // for (let alpha = 1, n = iterations; n > 0; --n) {
        // this.relaxRightToLeft(this._columns, alpha *= 0.99);
        // this.resolveCollisions(this._columns);
        // this.relaxLeftToRight(this._columns, alpha);
        // this.resolveCollisions(this._columns);
        // }
    }

    // private initializeNodeDepth(columns: Node[][]) {
    //     let ky = d3.min(columns, (nodes) => {
    //         return (this._size[1] - (nodes.length - 1) * this._nodePadding) / d3.sum(nodes, (d: any) => d.value);
    //     });

    //     columns.forEach((nodes) => {

    //         let y0 = 0;
    //         nodes.forEach((node, i) => {
    //             node.dy = node.value * ky;
    //         });

    //     });

    //     columns.forEach((nodes) => {

    //         let nodesHTotal = d3.sum(nodes, (node) => node.dy) + this._nodePadding * (nodes.length - 1);
    //         let y0 = (this._size[1] - nodesHTotal) / 2;
    //         nodes.forEach((node, i) => {
    //             node.y = y0;
    //             node.dy = node.value * ky;
    //             y0 = y0 + node.dy + this._nodePadding;
    //         });

    //     });

    //     this._links.forEach((link) => {
    //         link.dy = link.value * ky;
    //         let temp = link.value * ky;
    //         if (link.dy > 0 && link.dy < 0.7) {
    //             link.dy = 0.7;
    //             // (<Node>link.source).dy += 0.7 - temp;
    //             // (<Node>link.target).dy += 0.7 - temp;
    //         }
    //     });
    // }

    // private getKy(columns: Node[][]): { ky: number, nodeAddValueMap: Map<string, number> } {
    //     let ky = d3.min(columns, (nodes) => {
    //         return (this._size[1] - (nodes.length - 1) * this._nodePadding) / d3.sum(nodes, (d: any) => d.value);
    //     });
    //     let nodeAddValueMap = new Map<string, number>();
    //     let colAddValueMap = new Map<number, number>();

    //     let nodeSourceAndTargetAddMap = new Map<string, [number, number]>();
    //     for (let i = 0; i < this.columnCount; i++) {
    //         this.columnMap.get(i).forEach(id => {
    //             nodeSourceAndTargetAddMap.set(id, [0, 0]);
    //         })
    //     }

    //     this._links.forEach((link) => {
    //         let dy = link.value * ky;
    //         let temp = link.value * ky;
    //         if (dy > 0 && dy <= 1) {
    //             for (let i = 0; i < this.columnCount; i++) {
    //                 let sourceValue = nodeSourceAndTargetAddMap.get((<Node>link.source).id)[0] + (1 - temp) / ky;
    //                 let targetValue = nodeSourceAndTargetAddMap.get((<Node>link.target).id)[1] + (1 - temp) / ky;
    //                 nodeSourceAndTargetAddMap.set((<Node>link.source).id,
    //                  [sourceValue, nodeSourceAndTargetAddMap.get((<Node>link.source).id)[1]]);
    //                 nodeSourceAndTargetAddMap.set((<Node>link.target).id,
    //                  [nodeSourceAndTargetAddMap.get((<Node>link.target).id)[0], targetValue]);
    //             }
    //         }
    //     });
    //     nodeSourceAndTargetAddMap.forEach((item, key) => {
    //         nodeAddValueMap.set(key, _.max(item));
    //     })

    //     this.columnMap.forEach((nodeIds, i) => {
    //         nodeIds.forEach(id => {
    //             colAddValueMap.set(i, colAddValueMap.has(i) ? colAddValueMap.get(i) : 0 + nodeAddValueMap.get(id))
    //         })
    //     })

    //     ky = d3.min(columns, (nodes, i) => {
    //         return (this._size[1] - (nodes.length - 1) * this._nodePadding) /
    //             (d3.sum(nodes, (d: any) => d.value) + colAddValueMap.get(i));
    //     });
    //     return { ky: ky, nodeAddValueMap: nodeAddValueMap };
    // }

    private initializeNodeDepth(columns: Node[][]) {

        // let kyTemp = this.getKy(columns);
        // let ky = kyTemp.ky;
        // let nodeAddValueMap = kyTemp.nodeAddValueMap;
        let ky = d3.min(columns, (nodes) => {
            return (this._size[1] - (nodes.length - 1) * this._nodePadding) / d3.sum(nodes, (d: any) => d.value);
        });
        ky = d3.min(columns, (nodes, i) => {
            return (this._size[1] - (nodes.length - 1) * this._nodePadding) /
                (d3.sum(nodes, (d: any) => d.value) + nodes.length * 15 / ky);
        });

        columns.forEach((nodes) => {
            nodes.forEach((node, i) => {
                // node.value += nodeAddValueMap.get(node.id);
                node.value += 11 / ky;
                node.dy = node.value * ky;
            });
        });

        this._links.forEach((link) => {
            link.dy = link.value * ky;
            // const temp = link.value * ky;
            // if (link.dy > 0 && link.dy < 1) {
            //     link.dy = 1;
            // }
        });
        columns.forEach((nodes) => {

            // // 让node居中分布
            // const nodesHTotal = d3.sum(nodes, (node) => node.dy) + this._nodePadding * (nodes.length - 1);
            // let y0 = (this._size[1] - nodesHTotal) / 2;
            // nodes.forEach((node, i) => {
            //     node.y = y0;
            //     node.dy = node.value * ky;
            //     y0 = y0 + node.dy + this._nodePadding;
            // });

            // 让node竖直方向铺满
            const nodesHTotal = d3.sum(nodes, (node) => node.dy);
            const actualNodePadding = (this._size[1] - nodesHTotal)/(nodes.length - 1);
            let y0 = 0;
            nodes.forEach((node, i) => {
                node.y = y0;
                node.dy = node.value * ky;
                y0 = y0 + node.dy + actualNodePadding;
            });

        });

        // this._links.forEach((link) => {
        //     link.dy = link.value * ky;
        // });
    }

    private resolveCollisions(columns) {
        columns.forEach((nodes) => {
            let node,
                dy,
                y0 = 0,
                n = nodes.length,
                i;

            // Push any overlapping nodes down.
            nodes.sort((a, b) => a.y - b.y);
            for (i = 0; i < n; ++i) {
                node = nodes[i];
                dy = y0 - node.y;
                if (dy > 0) { node.y += dy; }
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
                    if (dy > 0) { node.y -= dy; }
                    y0 = node.y;
                }
            }
        });
    }
    private relaxRightToLeft(columns: any[], alpha) {
        const self = this;
        columns.slice().reverse().forEach((nodes: Node[]) => {
            nodes.forEach((node) => {
                if (node.sourceLinks.length) {
                    const totalValue = d3.sum(node.sourceLinks.filter(link => link.linkGroupIndex === 0), (d) => d.value);
                    if (totalValue > 0) {
                        const y = d3.sum(node.sourceLinks.filter(link => link.linkGroupIndex === 0), weightedTarget)
                            / totalValue;
                        node.y += (y - this.center(node)) * alpha;
                    }
                    totalValue === 0 ? console.info(node.sourceLinks) : '';
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
        const self = this;
        columns.forEach((nodes: Node[], breadth) => {
            nodes.forEach((node) => {
                if (node.targetLinks.length) {
                    const totalValue = d3.sum(node.targetLinks.filter(link => link.linkGroupIndex === 0), (d) => d.value);
                    if (totalValue > 0) {
                        const y = d3.sum(node.targetLinks.filter(link => link.linkGroupIndex === 0), weightedSource) / totalValue;
                        node.y += (y - this.center(node)) * alpha;
                    }
                }
            });
        });

        function weightedSource(link) {
            return self.center(link.source) * link.value;
        }
    }
    private computeLinkDepths() {
        // this._nodes.forEach((node) => {
        //     node.sourceLinks.sort(ascendingTargetDepth);
        //     node.targetLinks.sort(ascendingSourceDepth);
        // });

        this._nodes.forEach((node) => {
            for (let i = 0; i <= this.columnCount - 1; i++) {
                let sy = 0, ty = 0;
                node.sourceLinks.filter(link => link.linkGroupIndex === i).forEach((link) => {
                    link.sy = sy;
                    sy += link.dy;
                });
                node.targetLinks.filter(link => link.linkGroupIndex === i).forEach((link) => {
                    link.ty = ty;
                    ty += link.dy;
                });
            }
            for (let i = this.columnCount; i <= this.columnCount + this.columnCount - 1; i++) {
                let sy = 0, ty = 0;
                node.sourceLinks.filter(link => link.linkGroupIndex === i).forEach((link) => {
                    link.sy = sy;
                    sy += link.dy;
                });
                node.targetLinks.filter(link => link.linkGroupIndex === i).forEach((link) => {
                    link.ty = ty;
                    ty += link.dy;
                });
            }

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
    sourceChain: string[];
    linkGroupIndex?: number;
    inpatIds: string[];

    source: Node | string;
    target: Node | string;
    value: number;
    dy?: number;
    sy?: number;
    ty?: number;
}

export class Node {

    id: string;
    label: string;
    color?: string;
    value: number;
    sourceLinks?: Link[];
    targetLinks?: Link[];
    tips?: string[];
    dx?: number;
    dy?: number;
    x?: number;
    y?: number;
}
