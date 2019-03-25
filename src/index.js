import React, { Component } from "react";
import PropTypes from "prop-types";
import MapboxClient from "mapbox";
import { WebMercatorViewport } from "viewport-mercator-project";
import "./styles.css";

class Geocoder extends Component {
    debounceTimeout = null;
    state = {
        queryString: "",
        results: [],
        selectedResult: null,
        showResults: false
    };

    onChange = event => {
        const {
            timeout,
            queryParams,
            localGeocoder,
            limit,
            localOnly
        } = this.props;
        const queryString = event.target.value;
        this.setState({ queryString });

        if (!queryString) {
            return;
        }

        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => {
            const localResults = localGeocoder
                ? localGeocoder(queryString)
                : [];
            const params = {
                ...queryParams,
                ...{ limit: limit - localResults.length }
            };

            if (params.limit > 0 && !localOnly) {
                this.client.geocodeForward(queryString, params).then(res => {
                    this.setState({
                        selectedResult: 0,
                        results: [...localResults, ...res.entity.features]
                    });
                });
            } else {
                this.setState({
                    selectedResult: 0,
                    results: localResults
                });
            }
        }, timeout);
    };

    onKeyDown = event => {
        const { queryString, selectedResult, results } = this.state;

        if (!results) {
            return;
        }

        switch (event.keyCode) {
            case 27: //esc
                this.inputRef.current.blur();
                break;
            case 13: //enter
                this.onSelected(results[selectedResult]);
                this.inputRef.current.blur();
                break;
            case 38: //up
                event.preventDefault();
                this.setState(
                    {
                        selectedResult: !selectedResult
                            ? results.length - 1
                            : selectedResult - 1
                    },
                    () => {
                        this.inputRef.current.selectionStart = this.inputRef.current.selectionEnd =
                            queryString.length;
                    }
                );
                break;
            case 40: //down
                event.preventDefault();
                this.setState(
                    {
                        selectedResult:
                            selectedResult === results.length - 1
                                ? 0
                                : selectedResult + 1
                    },
                    () => {
                        this.inputRef.current.selectionStart = this.inputRef.current.selectionEnd =
                            queryString.length;
                    }
                );
                break;
        }
    };

    onSelected = item => {
        const {
            viewport,
            onSelected,
            transitionDuration,
            hideOnSelect,
            pointZoom,
            formatInputItem
        } = this.props;
        let newViewport = new WebMercatorViewport(viewport);
        const { bbox, center } = item;

        if (bbox) {
            newViewport = newViewport.fitBounds([
                [bbox[0], bbox[1]],
                [bbox[2], bbox[3]]
            ]);
        } else {
            newViewport = {
                longitude: center[0],
                latitude: center[1],
                zoom: pointZoom
            };
        }

        const { longitude, latitude, zoom } = newViewport;

        onSelected(
            {
                ...viewport,
                ...{ longitude, latitude, zoom, transitionDuration }
            },
            item
        );

        const nextState = {
            queryString: formatInputItem(item)
        };

        if (hideOnSelect) {
            nextState["showResults"] = false;
        }

        this.setState(nextState);
    };

    showResults = () => {
        this.setState({ showResults: true });
    };

    hideResults = () => {
        this.setState({ showResults: false });
    };

    constructor(props) {
        super();
        this.inputRef = React.createRef();
        this.client = new MapboxClient(props.mapboxApiAccessToken);
    }

    render() {
        const {
            queryString,
            results,
            showResults,
            selectedResult
        } = this.state;
        const {
            formatListItem,
            className,
            inputComponent,
            itemComponent
        } = this.props;

        const Input = inputComponent || "input";
        const Item = itemComponent || "div";

        return (
            <div className={`react-geocoder ${className}`}>
                <Input
                    ref={this.inputRef}
                    value={queryString}
                    onChange={this.onChange}
                    onBlur={this.hideResults}
                    onFocus={this.showResults}
                    onKeyDown={this.onKeyDown}
                    onKeyUp={event => event.preventDefault()}
                />

                {showResults && !!results.length && (
                    <div className="react-geocoder-results">
                        {results.map((item, index) => (
                            <Item
                                key={index}
                                className={
                                    index === selectedResult
                                        ? "react-geocoder-item react-geocoder-item-selected"
                                        : "react-geocoder-item"
                                }
                                onClick={() => this.onSelected(item)}
                                item={item}
                            >
                                {formatListItem(item)}
                            </Item>
                        ))}
                    </div>
                )}
            </div>
        );
    }
}

Geocoder.propTypes = {
    timeout: PropTypes.number,
    queryParams: PropTypes.object,
    viewport: PropTypes.object.isRequired,
    onSelected: PropTypes.func.isRequired,
    transitionDuration: PropTypes.number,
    hideOnSelect: PropTypes.bool,
    pointZoom: PropTypes.number,
    mapboxApiAccessToken: PropTypes.string.isRequired,
    formatInputItem: PropTypes.func,
    formatListItem: PropTypes.func,
    className: PropTypes.string,
    inputComponent: PropTypes.func,
    itemComponent: PropTypes.func,
    limit: PropTypes.number,
    localGeocoder: PropTypes.func,
    localOnly: PropTypes.bool
};

Geocoder.defaultProps = {
    timeout: 300,
    transitionDuration: 0,
    hideOnSelect: false,
    pointZoom: 16,
    formatInputItem: item => item.place_name,
    formatListItem: item => item.place_name,
    queryParams: {},
    className: "",
    limit: 5
};

export default Geocoder;
